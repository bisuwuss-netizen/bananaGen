from conftest import assert_success_response


class TestUserTemplateAPI:
    def test_list_user_templates_empty(self, client):
        response = client.get("/api/user-templates")

        data = assert_success_response(response)
        assert data["data"]["templates"] == []
        assert data["data"]["pagination"]["total"] == 0

    def test_upload_list_and_delete_user_template(self, client, sample_image_file):
        upload_response = client.post(
            "/api/user-templates",
            data={"template_image": (sample_image_file, "template.png")},
            content_type="multipart/form-data",
        )

        upload_data = assert_success_response(upload_response, 201)
        template_id = upload_data["data"]["template_id"]

        list_response = client.get("/api/user-templates")
        list_data = assert_success_response(list_response)
        template_ids = [template["template_id"] for template in list_data["data"]["templates"]]
        assert template_id in template_ids

        delete_response = client.delete(f"/api/user-templates/{template_id}")
        assert_success_response(delete_response)

        list_after_delete = client.get("/api/user-templates")
        list_after_delete_data = assert_success_response(list_after_delete)
        template_ids_after_delete = [
            template["template_id"] for template in list_after_delete_data["data"]["templates"]
        ]
        assert template_id not in template_ids_after_delete
