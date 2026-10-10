// 测试 main.js 是否能加载（模拟浏览器环境）
const fs = require('fs');

// 模拟浏览器环境
global.window = {
  addEventListener: () => {},
  game: null
};
global.document = {
  getElementById: () => ({
    getContext: () => ({
      fillRect: () => {},
      fillStyle: '',
      font: '',
      textAlign: '',
      fillText: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      rect: () => {},
      translate: () => {},
      save: () => {},
      restore: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      strokeStyle: '',
      lineWidth: 0,
      shadowColor: '',
      shadowBlur: 0,
      globalAlpha: 1,
      font: ''
    }),
    width: 520,
    height: 520
  })
};
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);

// 加载并检查语法
const code = fs.readFileSync('main.js', 'utf8');
try {
  eval(code);
  console.log('✅ 语法检查通过');
} catch(e) {
  console.error('❌ 语法错误:', e.message);
  console.error(e.stack);
}
