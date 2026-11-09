// সাধারণ রিকোয়েস্ট লগার মিডলওয়্যার
function requestLogger(req, res, next) {
  // টেস্ট চলার সময় কনসোল পরিষ্কার রাখতে লগিং বন্ধ থাকবে
  if (process.env.NODE_ENV !== "test") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
}

module.exports = {
  requestLogger,
};
