import React, { useState, useEffect } from 'react';
import { listPedagogies, type PedagogyModel } from '@/api/endpoints';
import { Book, CheckCircle } from 'lucide-react';

interface PedagogySelectorProps {
  onSelect: (pedagogyId: string) => void;
  selectedPedagogyId?: string;
  scene?: 'theory' | 'practice' | 'review' | 'mixed';
}

export const PedagogySelector: React.FC<PedagogySelectorProps> = ({
  onSelect,
  selectedPedagogyId,
  scene,
}) => {
  const [pedagogies, setPedagogies] = useState<PedagogyModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPedagogies();
  }, [scene]);

  const loadPedagogies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listPedagogies(scene);
      if (response.data?.pedagogies) {
        setPedagogies(response.data.pedagogies);
      }
    } catch (err: any) {
      console.error('加载教法模型失败:', err);
      setError('加载教法模型失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-banana-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-4">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Book size={16} />
        选择教法模式
      </h4>
      
      <div className="grid grid-cols-2 gap-4">
        {pedagogies.map((pedagogy) => (
          <div
            key={pedagogy.id}
            onClick={() => onSelect(pedagogy.id)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              selectedPedagogyId === pedagogy.id
                ? 'border-banana-500 bg-banana-50'
                : 'border-gray-200 hover:border-banana-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 flex items-center gap-2">
                  {pedagogy.name}
                  {selectedPedagogyId === pedagogy.id && (
                    <CheckCircle size={16} className="text-banana-500" />
                  )}
                </h5>
                <p className="text-xs text-gray-500 mt-0.5">{pedagogy.name_en}</p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{pedagogy.description}</p>
              </div>
            </div>
            
            {/* 教学环节结构 */}
            {pedagogy.structure && pedagogy.structure.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1.5">教学环节:</p>
                <div className="flex flex-wrap gap-1">
                  {pedagogy.structure.slice(0, 5).map((step, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {step}
                    </span>
                  ))}
                  {pedagogy.structure.length > 5 && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-400 rounded">
                      +{pedagogy.structure.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* 适用场景标签 */}
            <div className="mt-2 flex flex-wrap gap-1">
              {pedagogy.applicable_scenes.map((scene) => (
                <span
                  key={scene}
                  className={`inline-block px-1.5 py-0.5 text-xs rounded ${
                    scene === 'theory'
                      ? 'bg-blue-100 text-blue-700'
                      : scene === 'practice'
                      ? 'bg-green-100 text-green-700'
                      : scene === 'review'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {scene === 'theory' ? '理论' : scene === 'practice' ? '实训' : scene === 'review' ? '复习' : '综合'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
