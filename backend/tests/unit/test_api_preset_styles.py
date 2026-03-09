from conftest import assert_success_response


class TestPresetStylesAPI:
    def test_list_preset_styles_empty(self, client):
        response = client.get("/api/preset-styles/")

        data = assert_success_response(response)
        assert data["data"]["styles"] == []
