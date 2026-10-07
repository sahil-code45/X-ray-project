const { User } = require('./models');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const [user, created] = await User.findOrCreate({
      where: { email: 'admin@teleradiology.com' },
      defaults: { password: hashedPassword, role: 'admin', status: 'approved' }
    });
    if(created) {
      console.log('Admin user created: admin@teleradiology.com / admin123');
    } else {
      console.log('Admin user already exists.');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit();
})();
