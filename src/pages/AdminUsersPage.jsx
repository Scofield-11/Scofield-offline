import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Shield, KeyRound, Trash2, RefreshCw, Search, Users, UserCheck } from 'lucide-react';
import api, { getCurrentUser } from '../api/axiosConfig';
import { toast } from 'react-toastify';

function AdminUsersPage() {
  const currentUser = getCurrentUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi tải danh sách người dùng!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.display_name && u.display_name.toLowerCase().includes(q))
    );
  }, [users, searchTerm]);

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset mật khẩu của tài khoản "${user.username}" về mặc định "123456"?`)) {
      return;
    }
    setProcessingId(user.id);
    try {
      await api.put(`/admin/users/${user.id}/reset-password`, { new_password: '123456' });
      toast.success(`Đã reset mật khẩu của ${user.username} về 123456!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi reset mật khẩu!');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.role === 'admin') {
      return toast.warning('Không thể xóa tài khoản Admin!');
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.username}"?`)) {
      return;
    }
    setProcessingId(user.id);
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast.success(`Đã xóa tài khoản ${user.username}!`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi khi xóa tài khoản!');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container-fluid mt-2 mb-5 mx-auto px-2 px-md-3" style={{ maxWidth: '1000px' }}>
      <div className="dashboard-hero-card p-3 p-md-4 mb-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex align-items-center gap-2 text-white">
            <Shield size={24} />
            <div>
              <h4 className="fw-bold mb-0">Quản trị Tài khoản</h4>
              <span className="small opacity-75">
                Quản lý người dùng & cấp lại mật khẩu mặc định (123456)
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="cloud-pill-btn"
              onClick={fetchUsers}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
              <span>Làm mới</span>
            </button>
            <Link to="/" className="cloud-pill-btn text-decoration-none">
              ← Về Thư viện
            </Link>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-6 col-md-4">
          <div className="bento-stat-card h-100">
            <div className="bento-icon-wrap bento-purple">
              <Users size={20} />
            </div>
            <div>
              <div className="bento-value">{users.length}</div>
              <div className="bento-sub">Tổng số tài khoản</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4">
          <div className="bento-stat-card h-100">
            <div className="bento-icon-wrap bento-emerald">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="bento-value">
                {users.filter((u) => u.role !== 'admin').length}
              </div>
              <div className="bento-sub">Tài khoản Học viên</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="bento-stat-card h-100">
            <div className="bento-icon-wrap bento-amber">🔑</div>
            <div>
              <div className="bento-value">123456</div>
              <div className="bento-sub">Mật khẩu Reset mặc định</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 rounded-4 p-3 mb-3 bg-white">
        <div className="d-flex align-items-center gap-2 bg-light rounded-3 px-3 py-1 border">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            className="form-control border-0 bg-transparent shadow-none fw-semibold"
            placeholder="Tìm theo tên đăng nhập hoặc tên hiển thị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card border-0 rounded-4 overflow-hidden bg-white shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="py-3 px-3">ID</th>
                <th className="py-3">Tên đăng nhập</th>
                <th className="py-3">Tên hiển thị</th>
                <th className="py-3 text-center">Vai trò</th>
                <th className="py-3">Ngày tạo</th>
                <th className="py-3 px-3 text-end">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted fw-bold">
                    ⏳ Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted fw-bold">
                    📭 Không tìm thấy tài khoản nào
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 text-muted fw-bold">#{u.id}</td>
                    <td>
                      <span className="fw-bold text-dark">{u.username}</span>
                    </td>
                    <td className="text-secondary fw-semibold">
                      {u.display_name || u.username}
                    </td>
                    <td className="text-center">
                      {u.role === 'admin' ? (
                        <span className="badge chip-primary rounded-pill px-3 py-1">
                          🛡️ Admin
                        </span>
                      ) : (
                        <span className="badge chip-slate rounded-pill px-3 py-1">
                          👤 Học viên
                        </span>
                      )}
                    </td>
                    <td className="text-muted small">{formatDate(u.created_at)}</td>
                    <td className="px-3 text-end">
                      <div className="d-inline-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-mobile-chip chip-warning"
                          disabled={processingId === u.id}
                          onClick={() => handleResetPassword(u)}
                          title="Đặt lại mật khẩu về 123456"
                        >
                          <KeyRound size={13} />
                          <span>🔄 Reset MK (123456)</span>
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn-icon-soft chip-danger"
                            disabled={processingId === u.id}
                            onClick={() => handleDeleteUser(u)}
                            title="Xóa tài khoản"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminUsersPage;