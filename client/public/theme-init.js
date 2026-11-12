// Áp dụng giao diện sáng/tối trước khi render để tránh nháy màn hình
try {
  var t = localStorage.getItem('fs-theme');
  var dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
} catch (e) {}
