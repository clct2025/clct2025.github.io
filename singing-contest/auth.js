export function checkAuth() {
    const session = sessionStorage.getItem('admin_token');
    if (!session) {
        window.location.href = 'admin.html?login=true'; // Redirect logic handled in admin.html
        return false;
    }
    return true;
}

export function login(username, password) {
    if (username === 'admin' && password === 'password') {
        sessionStorage.setItem('admin_token', 'valid');
        return true;
    }
    return false;
}

export function logout() {
    sessionStorage.removeItem('admin_token');
    window.location.reload();
}
