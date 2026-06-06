(function () {
  function estimateTokens(value) {
    if (!value) {
      return 0;
    }

    return Math.ceil(String(value).length / 4);
  }

  DOMScout.tokenCounter = {
    estimateTokens,
  };
})();
