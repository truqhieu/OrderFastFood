import { useState } from 'react';
import { api } from '../../api.js';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';

const EMPTY = { name: '', icon: '🍽️' };

export default function AdminCategories() {
  const toast = useToast();
  const { confirm } = useDialog();
  const [form, setForm] = useState(EMPTY);
  const paged = usePaged('/categories?_sort=id', 8);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast('Nhập tên danh mục', 'error');
    const data = { name: form.name.trim(), icon: form.icon || '🍽️' };
    if (form.id) await api.patch(`/categories/${form.id}`, data);
    else await api.post('/categories', data);
    toast(form.id ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục');
    setForm(EMPTY);
    paged.reload();
  };

  const remove = async (c) => {
    const shops = await api.get(`/restaurants?categoryId=${c.id}`);
    if (shops.length) return toast(`Còn ${shops.length} quán thuộc danh mục này, hãy chuyển quán sang danh mục khác trước`, 'error');
    if (!(await confirm({ title: 'Xoá danh mục?', message: `Danh mục "${c.name}" sẽ bị xoá.`, confirmText: 'Xoá', danger: true }))) return;
    await api.delete(`/categories/${c.id}`);
    toast('Đã xóa danh mục');
    paged.reload();
  };

  return (
    <div>
      <h2>Danh mục</h2>
      <form className="card form" onSubmit={save}>
        <div className="row">
          <label>Icon<input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
          <label>Tên danh mục<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <div className="actions">
            {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>Hủy</button>}
            <button className="btn btn-primary">{form.id ? 'Lưu' : '+ Thêm'}</button>
          </div>
        </div>
      </form>
      <div className="card">
        <table className="table">
          <thead><tr><th>#</th><th>Danh mục</th><th></th></tr></thead>
          <tbody>
            {paged.data.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.icon} {c.name}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm(c)}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} total={paged.total} />
      </div>
    </div>
  );
}
