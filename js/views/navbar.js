// Azota Toán - Navigation Bar Component
const Navbar = {
  render(user, onLogout, onChangeView, onToggleDark, currentView) {
    const isDark = document.documentElement.classList.contains('dark');
    const isAdmin = user && user.role === 'admin';
    const isStudent = user && user.role === 'student';

    return `
      <header class="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 glass-nav transition-colors">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            
            <!-- Logo & Brand -->
            <div class="flex items-center space-x-3 cursor-pointer" onclick="window.App.navigateTo('${isAdmin ? 'admin-dashboard' : (isStudent ? 'student-dashboard' : 'home')}')">
              <img src="./assets/logo-thay-tung.jpg" alt="Logo Toán thầy Tùng" class="w-10 h-10 rounded-xl object-cover shadow-md shadow-blue-500/20 border border-slate-200 dark:border-slate-700" />
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Toán thầy Tùng</span>
                  <span class="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">PWA</span>
                </div>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-none">Khảo sát & Kiểm tra Toán Chuẩn 2018</p>
              </div>
            </div>

            <!-- Right Controls -->
            <div class="flex items-center space-x-2 sm:space-x-3">
              
              <!-- Dark Mode Toggle Button -->
              <button onclick="window.App.toggleDarkMode()" title="Chuyển chế độ Sáng/Tối" class="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                ${isDark ? `
                  <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                ` : `
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                `}
              </button>

              ${user ? `
                <!-- User Profile Pill -->
                <div class="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div class="flex flex-col text-right hidden sm:block">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-100">${user.name || (isAdmin ? 'Quản trị viên' : 'Học sinh')}</span>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400">${isAdmin ? 'Thiết bị bảo mật duy nhất' : `Lớp ${user.class || 'Toán'}`}</span>
                  </div>
                  
                  <div class="w-8 h-8 rounded-lg ${isAdmin ? 'bg-amber-500' : 'bg-blue-600'} text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    ${isAdmin ? '👑' : (user.name ? user.name.charAt(0) : 'H')}
                  </div>

                  <!-- Đăng xuất -->
                  <button onclick="window.App.logout()" title="Đăng xuất" class="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                  </button>
                </div>
              ` : `
                <!-- Switch to Admin Login Shortcut -->
                <button onclick="window.App.navigateTo('admin-login')" class="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center space-x-1">
                  <span>🔒 Quản trị viên</span>
                </button>
              `}

            </div>
          </div>
        </div>
      </header>
    `;
  }
};

window.Navbar = Navbar;
