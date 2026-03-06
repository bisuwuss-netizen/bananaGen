interface Window {
  redirect_homepage?: (options: {
    request: string;
    persistent: boolean;
    onSuccess: (response: any) => void;
    onFailure: (error_code: any, error_message: any) => void;
  }) => void;
  generateHighFidelityPPT?: (htmlUrl: string) => void;
}
