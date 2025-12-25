export type ApiProduct = {
  id: string;
  title: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  offerPrice?: string;
  category?: 'accessories' | 'gifts';
  subcategory?: string;
  imageUrl?: string;
  image?: string;
  badge?: string;
  availableQuantity?: number;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export async function fetchAllProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { accessories: ApiProduct[]; gifts: ApiProduct[] };
}

export async function createProduct(product: Omit<ApiProduct, 'id'>) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiProduct;
}

export async function updateProduct(
  id: string,
  category: 'accessories' | 'gifts',
  product: Partial<Omit<ApiProduct, 'id'>>,
) {
  const res = await fetch(`${API_BASE}/products/${id}?category=${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiProduct;
}

export async function deleteProduct(id: string, category?: 'accessories' | 'gifts') {
  const res = await fetch(
    `${API_BASE}/products/${id}${category ? `?category=${category}` : ''}`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiProduct;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

