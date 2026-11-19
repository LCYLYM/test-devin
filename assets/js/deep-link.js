/* Deep links: ?salary=15000&template=pig — prefill and share-ready URLs. */
(function () {
  'use strict';
  function apply() {
    var params = new URLSearchParams(location.search);

    var salary = params.get('salary');
    if (salary) {
      var input = document.getElementById('salaryInput');
      var form = document.getElementById('salaryForm');
      var value = Number(salary);
      if (input && form && isFinite(value) && value > 0) {
        input.value = String(value);
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }

    var template = params.get('template');
    if (template) {
      var btn = document.querySelector('.template-switch button[data-template="' + template + '"]');
      if (btn) btn.click();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
