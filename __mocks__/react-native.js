module.exports = {
  Platform: {
    OS: 'web',
    select: function(options) { return options.web; }
  },
  Linking: {
    openURL: function() {},
    addEventListener: function() {},
    removeEventListener: function() {},
    canOpenURL: function() {},
    getInitialURL: function() {}
  },
  Alert: {
    alert: function() {}
  }
}; 