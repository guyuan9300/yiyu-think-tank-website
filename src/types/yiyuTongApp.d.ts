export {};

declare global {
  interface Window {
    __YIYU_TONG_APP__?: {
      getState: () => {
        currentPage: string;
        currentUrl: string;
        selectedDetailId: string;
        selectedBookId: string;
        selectedCaseId: string;
      };
      openInternalUrl: (target: string) => void;
      navigate: (page: string, id?: string) => void;
    };
  }
}
