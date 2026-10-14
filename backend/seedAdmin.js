const { User } = require('./models');
const bcrypt = require('bcrypt');

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('Aman@1020', 10);
    const [user, created] = await User.findOrCreate({
      where: { email: 'aman123@gmail.com' },
      defaults: { password: hashedPassword, role: 'admin', status: 'approved' }
    });
    if(created) {
      console.log('Admin user created: aman123@gmail.com / Aman@1020');
    } else {
      await user.update({ password: hashedPassword, role: 'admin', status: 'approved' });
      console.log('Admin user updated: aman123@gmail.com / Aman@1020');
    }
  } catch(e) {
    console.error(e);
  }
  process.exit();
})();
