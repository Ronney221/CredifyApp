module.exports = {
  openBrowserAsync: jest.fn(),
  dismissBrowser: jest.fn(),
  WebBrowserPresentationStyle: {
    FULL_SCREEN: 'full_screen',
    OVER_FULL_SCREEN: 'over_full_screen',
    FORM_SHEET: 'form_sheet',
    PAGE_SHEET: 'page_sheet',
    POPOVER: 'popover',
    AUTOMATIC: 'automatic'
  },
  WebBrowserAuthSessionResult: {
    CANCEL: 'cancel',
    DISMISS: 'dismiss',
    LOCKED: 'locked',
    SUCCESS: 'success'
  }
};