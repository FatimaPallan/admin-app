import { useEffect, useRef, useState } from 'react';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  fetchAllProducts,
  uploadImage,
  type ApiProduct,
} from './api';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

const ACCESSORIES_SUBCATEGORIES = [
  'Chain bracelet',
  'Necklaces',
  'Finger rings',
  'Kada Bracelet',
  'Thin wrist kada',
  'Hoops/Earrings',
  'Insta viral pinteresty products',
  'Mens Jewellery',
  'Korean earrings',
  'Combos',
  'Anklets',
  'Hair accessories',
  'Gifting',
  'Add ons',
];

const GIFTS_SUBCATEGORIES = [
  'Bouquet',
  'Premium hampers',
  'Budget Friendly hampers',
  'Accessories hampers',
  'Gifting options',
  'Gifts for her',
  'Gifts for him',
  'Wedding favour',
  'Baby shower favour',
  'Return gifts',
];

type FormState = {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  offerPrice: string;
  category: 'accessories' | 'gifts';
  subcategory: string;
  badge: string;
  imageUrl: string;
  availableQuantity: string;
};

const initialForm: FormState = {
  title: '',
  description: '',
  price: '',
  originalPrice: '',
  offerPrice: '',
  category: 'accessories',
  subcategory: '',
  badge: '',
  imageUrl: '',
  availableQuantity: '',
};

export default function App() {
  const [authed, setAuthed] = useState(() => {
    return localStorage.getItem('admin_authed') === 'true';
  });
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<{ accessories: ApiProduct[]; gifts: ApiProduct[] }>({
    accessories: [],
    gifts: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await fetchAllProducts();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products.');
    }
  };

  useEffect(() => {
    if (authed) {
      load();
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('admin_authed', 'true');
      setAuthed(true);
    } else {
      setError('Invalid password');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form.title.trim()) throw new Error('Title required');
      if (!form.category) throw new Error('Category required');

      let imageUrl = form.imageUrl;

      // Upload image to Cloudinary if file is selected
      if (imageFile) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadImage(imageFile);
        } catch (uploadErr: any) {
          throw new Error(`Image upload failed: ${uploadErr.message}`);
        } finally {
          setUploadingImage(false);
        }
      }

      // Create product with image URL (either from upload or manual input)
      // When editing, allow keeping existing image if no new image is provided
      if (!imageUrl && !editingProduct) {
        throw new Error('Please provide an image (upload file or enter URL)');
      }
      // If editing and no new image provided, use existing image
      if (editingProduct && !imageUrl && !imageFile) {
        imageUrl = editingProduct.imageUrl || editingProduct.image || '';
      }

      const productData: any = {
        ...form,
        imageUrl,
      };

      // Only include availableQuantity for accessories
      if (form.category === 'accessories' && form.availableQuantity) {
        productData.availableQuantity = parseInt(form.availableQuantity, 10);
      } else {
        delete productData.availableQuantity;
      }

      // Clean up empty strings
      if (!productData.originalPrice) delete productData.originalPrice;
      if (!productData.offerPrice) delete productData.offerPrice;
      if (!productData.subcategory) delete productData.subcategory;
      if (!productData.badge) delete productData.badge;
      // Keep legacy price field for backward compatibility, but prefer originalPrice/offerPrice
      if (!productData.price && productData.originalPrice) {
        productData.price = productData.originalPrice;
      }

      if (editingProduct) {
        // Update existing product
        await updateProduct(editingProduct.id, form.category, productData);
      } else {
        // Create new product
        await createProduct(productData);
      }

      setForm(initialForm);
      setEditingProduct(null);
      setImageFile(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ApiProduct) => {
    setEditingProduct(product);
    setForm({
      title: product.title || '',
      description: product.description || '',
      price: product.price || '',
      originalPrice: product.originalPrice || '',
      offerPrice: product.offerPrice || '',
      category: (product.category as 'accessories' | 'gifts') || 'accessories',
      subcategory: product.subcategory || '',
      badge: product.badge || '',
      imageUrl: product.imageUrl || product.image || '',
      availableQuantity:
        product.availableQuantity !== undefined ? String(product.availableQuantity) : '',
    });
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm(initialForm);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, category?: 'accessories' | 'gifts') => {
    setLoading(true);
    setError(null);
    try {
      await deleteProduct(id, category);
      if (editingProduct?.id === id) {
        handleCancelEdit();
      }
      await load();
    } catch (err) {
      setError('Failed to delete product.');
    } finally {
      setLoading(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-rose-50 px-4">
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl shadow-lg border border-amber-100 p-6 w-full max-w-sm space-y-4"
        >
          <div>
            <div className="text-xl font-bold text-neutral-900">Admin Login</div>
            <p className="text-sm text-gray-600">Enter the shared password to continue.</p>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Password"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-amber-600 text-white py-2 text-sm font-semibold hover:bg-amber-700"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-neutral-900">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold">Curations by Amreen — Admin</div>
            <div className="text-sm text-gray-500">Manage products for Accessories and Gifts.</div>
          </div>
          <div className="flex items-center gap-3">
            {loading && <div className="text-xs text-gray-500">Working...</div>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              {editingProduct && (
                <button
                  onClick={handleCancelEdit}
                  className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-300 rounded"
                >
                  Cancel
                </button>
              )}
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Title
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Original Price (₹)
              <input
                name="originalPrice"
                value={form.originalPrice}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
                inputMode="decimal"
                placeholder="Enter original price"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Discount/Sale Price (₹) - Optional
              <input
                name="offerPrice"
                value={form.offerPrice}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
                inputMode="decimal"
                placeholder="Enter discount price (leave empty if no discount)"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
                rows={2}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Category
              <select
                name="category"
                value={form.category}
                onChange={(e) => {
                  handleChange(e);
                  setForm((prev) => ({ ...prev, subcategory: '' }));
                }}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="accessories">Accessories</option>
                <option value="gifts">Gifts & Crafts</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Subcategory
              <select
                name="subcategory"
                value={form.subcategory}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select subcategory</option>
                {(form.category === 'accessories' ? ACCESSORIES_SUBCATEGORIES : GIFTS_SUBCATEGORIES).map(
                  (sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Badge (optional)
              <input
                name="badge"
                value={form.badge}
                onChange={handleChange}
                className="border rounded-md px-3 py-2 text-sm"
                placeholder="Featured / New / Premium"
              />
            </label>
            {form.category === 'accessories' && (
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Available Quantity (for accessories only)
                <input
                  name="availableQuantity"
                  value={form.availableQuantity}
                  onChange={handleChange}
                  className="border rounded-md px-3 py-2 text-sm"
                  type="number"
                  min="0"
                  placeholder="Leave empty if unlimited"
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-semibold md:col-span-2">
              Image (Upload to Cloudinary or paste URL)
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setForm((prev) => ({ ...prev, imageUrl: '' }));
                    }
                  }}
                  className="flex-1 border rounded-md px-3 py-2 text-sm"
                />
                {imageFile && (
                  <span className="text-xs text-gray-600 self-center">
                    {imageFile.name}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">OR</div>
              <input
                name="imageUrl"
                value={form.imageUrl}
                onChange={(e) => {
                  handleChange(e);
                  if (e.target.value) setImageFile(null);
                }}
                className="border rounded-md px-3 py-2 text-sm"
                placeholder="Paste image URL here..."
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="inline-flex items-center px-4 py-2 rounded-md bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60"
              >
                {uploadingImage
                  ? 'Uploading image...'
                  : loading
                    ? 'Saving...'
                    : editingProduct
                      ? 'Update Product'
                      : 'Add Product'}
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ProductList
            title="Accessories"
            items={products.accessories}
            onDelete={handleDelete}
            onEdit={handleEdit}
            editingProductId={editingProduct?.id}
          />
          <ProductList
            title="Gifts & Crafts"
            items={products.gifts}
            onDelete={handleDelete}
            onEdit={handleEdit}
            editingProductId={editingProduct?.id}
          />
        </section>
      </main>
    </div>
  );
}

function ProductList({
  title,
  items,
  onDelete,
  onEdit,
  editingProductId,
}: {
  title: string;
  items: ApiProduct[];
  onDelete: (id: string, category?: 'accessories' | 'gifts') => void;
  onEdit: (product: ApiProduct) => void;
  editingProductId?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="text-xs text-gray-500">{items.length} items</span>
      </div>
      <div className="space-y-3 max-h-[360px] overflow-auto">
        {items.map((p) => (
          <div
            key={p.id}
            className="border border-gray-100 rounded-lg p-3 flex items-center gap-3"
          >
            {p.imageUrl || p.image ? (
              <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={p.imageUrl || p.image}
                  alt={p.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-16 h-16 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-xs">
                No Image
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900">{p.title}</div>
              {p.subcategory && (
                <div className="text-xs text-gray-400 mt-0.5">{p.subcategory}</div>
              )}
              <div className="text-xs text-gray-500 truncate">{p.description}</div>
              <div className="flex items-center gap-2 mt-1">
                {p.offerPrice ? (
                  <>
                    <div className="text-sm font-semibold text-amber-700">₹{p.offerPrice}</div>
                    {p.originalPrice && (
                      <div className="text-xs text-gray-400 line-through">₹{p.originalPrice}</div>
                    )}
                  </>
                ) : p.originalPrice ? (
                  <div className="text-sm font-semibold text-amber-700">₹{p.originalPrice}</div>
                ) : (
                  <div className="text-sm font-semibold text-amber-700">₹{p.price || 'N/A'}</div>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.badge && (
                  <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {p.badge}
                  </span>
                )}
                {p.category === 'accessories' && p.availableQuantity !== undefined && (
                  <span
                    className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                      p.availableQuantity === 0
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : p.availableQuantity <= 3
                          ? 'bg-orange-50 text-orange-700 border border-orange-100'
                          : ''
                    }`}
                  >
                    {p.availableQuantity === 0
                      ? 'Sold Out'
                      : p.availableQuantity <= 3
                        ? `Only ${p.availableQuantity} left`
                        : `${p.availableQuantity} available`}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex flex-col gap-1">
              <button
                onClick={() => onEdit(p)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 border border-blue-200 rounded"
                disabled={editingProductId === p.id}
              >
                {editingProductId === p.id ? 'Editing...' : 'Edit'}
              </button>
              <button
                onClick={() => onDelete(p.id, p.category as 'accessories' | 'gifts')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!items.length && <div className="text-sm text-gray-500">No products.</div>}
      </div>
    </div>
  );
}

