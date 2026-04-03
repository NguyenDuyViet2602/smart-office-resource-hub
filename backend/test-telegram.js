const { Telegraf } = require('telegraf');
const bot = new Telegraf('8688431061:AAEjWVzoAEJvZZk7wMSuDTwzFHkt9hEDrbk');
bot.telegram.sendMessage('6092779522', 'Booking confirmed - Test from backend process')
  .then(r => { console.log('OK, message_id:', r.message_id); process.exit(0); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
