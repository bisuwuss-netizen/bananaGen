"""
Simplified Flask Application Entry Point
"""
import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from flask_migrate import Migrate

# Load environment variables from project root .env file
_project_root = Path(__file__).parent.parent
_env_file = _project_root / '.env'
load_dotenv(dotenv_path=_env_file, override=True)

from flask import Flask
from flask_cors import CORS
from models import db
from config import Config
from controllers.material_controller import material_bp, material_global_bp
from controllers.reference_file_controller import reference_file_bp
from controllers.settings_controller import settings_bp
from controllers.html_renderer_controller import html_renderer_bp
from controllers import project_bp, page_bp, template_bp, user_template_bp, export_bp, file_bp, preset_style_bp


def create_app():
    """Application factory"""
    app = Flask(__name__)
    
    # Load configuration from Config class
    app.config.from_object(Config)
    
    # 数据库 URI 已在 Config 类中配置（支持 MySQL 和 SQLite）
    # 如果环境变量 DATABASE_URL 已设置，将使用该值
    # 否则将使用 Config 类中构建的 MySQL 连接字符串
    
    # Ensure upload folder exists
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(backend_dir)
    upload_folder = os.path.join(project_root, 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config['UPLOAD_FOLDER'] = upload_folder
    
    # CORS configuration (parse from environment)
    raw_cors = os.getenv('CORS_ORIGINS', 'http://localhost:3000')
    if raw_cors.strip() == '*':
        cors_origins = '*'
    else:
        cors_origins = [o.strip() for o in raw_cors.split(',') if o.strip()]
    app.config['CORS_ORIGINS'] = cors_origins
    
    # Initialize logging (log to stdout so Docker can capture it)
    log_level = getattr(logging, app.config['LOG_LEVEL'], logging.INFO)
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    
    # 设置第三方库的日志级别，避免过多的DEBUG日志
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('werkzeug').setLevel(logging.INFO)  # Flask开发服务器日志保持INFO

    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=cors_origins)
    # Database migrations (Alembic via Flask-Migrate)
    Migrate(app, db)
    
    # Register blueprints
    app.register_blueprint(project_bp)
    app.register_blueprint(page_bp)
    app.register_blueprint(template_bp)
    app.register_blueprint(user_template_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(material_bp)
    app.register_blueprint(material_global_bp)
    app.register_blueprint(reference_file_bp, url_prefix='/api/reference-files')
    app.register_blueprint(settings_bp)
    app.register_blueprint(preset_style_bp)
    app.register_blueprint(html_renderer_bp)  # HTML渲染器API

    with app.app_context():
        # Auto-fix column types that may be varchar(255) instead of TEXT
        _fix_text_column_types(app)
        # Load settings from database and sync to app.config
        _load_settings_to_config(app)

    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'ok', 'message': 'Banana Slides API is running'}
    
    # Output language endpoint
    @app.route('/api/output-language', methods=['GET'])
    def get_output_language():
        """
        获取用户的输出语言偏好（从数据库 Settings 读取）
        返回: zh, ja, en, auto
        """
        from models import Settings
        try:
            settings = Settings.get_settings()
            return {'data': {'language': settings.output_language}}
        except SQLAlchemyError as db_error:
            logging.warning(f"Failed to load output language from settings: {db_error}")
            return {'data': {'language': Config.OUTPUT_LANGUAGE}}  # 默认中文

    # Root endpoint
    @app.route('/')
    def index():
        return {
            'name': 'Banana Slides API',
            'version': '1.0.0',
            'description': 'AI-powered PPT generation service',
            'endpoints': {
                'health': '/health',
                'api_docs': '/api',
                'projects': '/api/projects'
            }
        }
    
    return app


def _fix_text_column_types(app):
    """
    Fix columns that should be TEXT but were created as varchar(255)
    by an older db.create_all() call. Runs once on startup, idempotent.
    """
    from sqlalchemy import text as sa_text, inspect as sa_inspect
    try:
        inspector = sa_inspect(db.engine)
        if 'pages' not in inspector.get_table_names():
            return  # Database not yet initialized

        # Define columns that MUST be TEXT (not varchar)
        columns_to_fix = {
            'pages': ['outline_content', 'description_content', 'html_model'],
            'projects': ['idea_prompt', 'outline_text', 'description_text', 'extra_requirements'],
            'reference_files': ['markdown_content', 'error_message'],
        }

        fixed = []
        with db.engine.connect() as conn:
            for table, cols in columns_to_fix.items():
                if table not in inspector.get_table_names():
                    continue
                for col in cols:
                    result = conn.execute(
                        sa_text(f"SHOW COLUMNS FROM `{table}` WHERE Field = :col"),
                        {"col": col}
                    )
                    row = result.fetchone()
                    if row:
                        col_type = str(row[1]).lower()
                        if 'text' not in col_type:
                            # Column is varchar or other non-TEXT type, fix it
                            conn.execute(sa_text(
                                f"ALTER TABLE `{table}` MODIFY COLUMN `{col}` MEDIUMTEXT"
                            ))
                            conn.commit()
                            fixed.append(f"{table}.{col}: {col_type} -> MEDIUMTEXT")

        if fixed:
            logging.warning(f"Auto-fixed column types: {', '.join(fixed)}")
        else:
            logging.info("All TEXT columns have correct types")
    except Exception as e:
        logging.warning(f"Could not auto-fix column types: {e}")


def _load_settings_to_config(app):
    """Load settings from database and apply to app.config on startup"""
    from models import Settings
    try:
        settings = Settings.get_settings()
        
        # Load AI provider format (always sync, has default value)
        if settings.ai_provider_format:
            app.config['AI_PROVIDER_FORMAT'] = settings.ai_provider_format
            logging.info(f"Loaded AI_PROVIDER_FORMAT from settings: {settings.ai_provider_format}")
        
        # Load API configuration
        # Note: We load even if value is None/empty to allow clearing settings
        # But we only log if there's an actual value
        if settings.api_base_url is not None:
            # 将数据库中的统一 API Base 同步到 Google/OpenAI 两个配置，确保覆盖环境变量
            app.config['GOOGLE_API_BASE'] = settings.api_base_url
            app.config['OPENAI_API_BASE'] = settings.api_base_url
            if settings.api_base_url:
                logging.info(f"Loaded API_BASE from settings: {settings.api_base_url}")
            else:
                logging.info("API_BASE is empty in settings, using env var or default")

        if settings.api_key is not None:
            # 同步到两个提供商的 key，数据库优先于环境变量
            app.config['GOOGLE_API_KEY'] = settings.api_key
            app.config['OPENAI_API_KEY'] = settings.api_key
            if settings.api_key:
                logging.info("Loaded API key from settings")
            else:
                logging.info("API key is empty in settings, using env var or default")

        # Load image generation settings
        app.config['DEFAULT_RESOLUTION'] = settings.image_resolution
        app.config['DEFAULT_ASPECT_RATIO'] = settings.image_aspect_ratio
        logging.info(f"Loaded image settings: {settings.image_resolution}, {settings.image_aspect_ratio}")

        # Load worker settings (ensure integer type - DB column may be VARCHAR)
        app.config['MAX_DESCRIPTION_WORKERS'] = int(settings.max_description_workers) if settings.max_description_workers else 5
        app.config['MAX_IMAGE_WORKERS'] = int(settings.max_image_workers) if settings.max_image_workers else 8
        logging.info(f"Loaded worker settings: desc={settings.max_description_workers}, img={settings.max_image_workers}")

    except Exception as e:
        logging.warning(f"Could not load settings from database: {e}")


# Create app instance
app = create_app()


if __name__ == '__main__':
    # Run development server
    if os.getenv("IN_DOCKER", "0") == "1":
        port = 5000 # 在 docker 内部部署时始终使用 5000 端口.
    else:
        port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    logging.info(
        "\n"
        "╔══════════════════════════════════════╗\n"
        "║   🍌 Banana Slides API Server 🍌   ║\n"
        "╚══════════════════════════════════════╝\n"
        f"Server starting on: http://localhost:{port}\n"
        f"Output Language: {Config.OUTPUT_LANGUAGE}\n"
        f"Environment: {os.getenv('FLASK_ENV', 'development')}\n"
        f"Debug mode: {debug}\n"
        f"API Base URL: http://localhost:{port}/api\n"
        f"Database: {app.config['SQLALCHEMY_DATABASE_URI']}\n"
        f"Uploads: {app.config['UPLOAD_FOLDER']}"
    )
    
    # Using absolute paths for database, so WSL path issues should not occur
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)
