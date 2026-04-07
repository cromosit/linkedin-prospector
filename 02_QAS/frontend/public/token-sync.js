(function() {
  const token = localStorage.getItem('token')
  if (token) window.postMessage({ type: 'LP_PROSPECTOR_TOKEN', token }, '*')
})()
