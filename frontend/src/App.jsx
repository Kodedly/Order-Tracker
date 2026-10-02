import { useState, useEffect } from 'react'

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState(null)

  function fetchAll() {
    Promise.all([
      fetch('http://127.0.0.1:8000/products').then((res) => res.json()),
      fetch('http://127.0.0.1:8000/categories').then((res) => res.json()),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData)
        setCategories(categoriesData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAll()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    fetch('http://127.0.0.1:8000/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category_id: parseInt(categoryId),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Failed to create product')
        }
        return res.json()
      })
      .then(() => {
        setName('')
        setPrice('')
        setStock('')
        setCategoryId('')
        fetchAll()
      })
      .catch((err) => setFormError(err.message))
      .finally(() => setSubmitting(false))
  }

  function handleAddCategory(e) {
    e.preventDefault()
    setCategoryError(null)

    fetch('http://127.0.0.1:8000/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Failed to create category')
        }
        return res.json()
      })
      .then(() => {
        setNewCategoryName('')
        fetchAll()
      })
      .catch((err) => setCategoryError(err.message))
  }

  function handleDeleteCategory(id) {
    fetch(`http://127.0.0.1:8000/categories/${id}`, { method: 'DELETE' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete category (it may have products in it)')
        return res.json()
      })
      .then(() => fetchAll())
      .catch((err) => alert(err.message))
  }

  function categoryName(id) {
    const category = categories.find((c) => c.id === id)
    return category ? category.name : `Category ${id}`
  }

  if (loading) return <p className="text-slate-500">Loading products...</p>
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Products</h1>

      <div className="flex flex-col md:flex-row gap-6 justify-center mb-8">
        <form
          onSubmit={handleSubmit}
          className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-md w-full space-y-3"
        >
          <h2 className="text-lg font-semibold text-white">Add Product</h2>

          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
          />
          <input
            type="number"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
          />
          <input
            type="number"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded px-4 py-2"
          >
            {submitting ? 'Adding...' : 'Add Product'}
          </button>
        </form>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-xs w-full space-y-3 h-fit">
          <h2 className="text-lg font-semibold text-white">Categories</h2>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              placeholder="New category"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              required
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded px-3"
            >
              +
            </button>
          </form>

          {categoryError && <p className="text-red-400 text-sm">{categoryError}</p>}

          <ul className="space-y-1">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex justify-between items-center text-slate-300 text-sm bg-slate-900 rounded px-3 py-1.5"
              >
                {c.name}
                <button
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <h2 className="text-lg font-semibold text-white">{product.name}</h2>
            <p className="text-emerald-400 font-medium">₦{product.price}</p>
            <p className="text-slate-400 text-sm">Stock: {product.stock}</p>
            <p className="text-slate-500 text-xs mt-1">{categoryName(product.category_id)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ product_id: '', quantity: '' }])
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function fetchAll() {
    Promise.all([
      fetch('http://127.0.0.1:8000/orders').then((res) => res.json()),
      fetch('http://127.0.0.1:8000/customers').then((res) => res.json()),
      fetch('http://127.0.0.1:8000/products').then((res) => res.json()),
    ])
      .then(([ordersData, customersData, productsData]) => {
        setOrders(ordersData)
        setCustomers(customersData)
        setProducts(productsData)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAll()
  }, [])

  function updateItem(index, field, value) {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  function addItemRow() {
    setItems([...items, { product_id: '', quantity: '' }])
  }

  function removeItemRow(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    fetch('http://127.0.0.1:8000/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: parseInt(customerId),
        items: items.map((item) => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity),
        })),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Failed to create order')
        }
        return res.json()
      })
      .then(() => {
        setCustomerId('')
        setItems([{ product_id: '', quantity: '' }])
        fetchAll()
      })
      .catch((err) => setFormError(err.message))
      .finally(() => setSubmitting(false))
  }

  function handleCancel(orderId) {
    fetch(`http://127.0.0.1:8000/orders/${orderId}/cancel`, { method: 'PUT' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to cancel order')
        return res.json()
      })
      .then(() => fetchAll())
      .catch((err) => alert(err.message))
  }

  function productName(productId) {
    const product = products.find((p) => p.id === productId)
    return product ? product.name : `Product ${productId}`
  }

  function customerName(custId) {
    const customer = customers.find((c) => c.id === custId)
    return customer ? customer.name : `Customer ${custId}`
  }

  if (loading) return <p className="text-slate-500">Loading orders...</p>
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Orders</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-8 max-w-lg mx-auto space-y-3"
      >
        <h2 className="text-lg font-semibold text-white">Create Order</h2>

        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-center">
            <select
              value={item.product_id}
              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
              required
              className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (₦{p.price}, stock: {p.stock})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              required
              min="1"
              className="w-20 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItemRow(index)}
                className="text-red-400 hover:text-red-300 px-2"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addItemRow}
          className="text-emerald-400 hover:text-emerald-300 text-sm"
        >
          + Add item
        </button>

        {formError && <p className="text-red-400 text-sm">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded px-4 py-2"
        >
          {submitting ? 'Placing order...' : 'Place Order'}
        </button>
      </form>

      <div className="space-y-3 max-w-lg mx-auto">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-white font-semibold">
                  Order #{order.id} — {customerName(order.customer_id)}
                </h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    order.status === 'cancelled'
                      ? 'bg-red-900 text-red-300'
                      : order.status === 'delivered'
                      ? 'bg-emerald-900 text-emerald-300'
                      : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-emerald-400 font-medium">₦{order.total}</p>
            </div>

            <ul className="text-slate-400 text-sm mb-2">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.quantity} × {productName(item.product_id)} (₦{item.unit_price} each)
                </li>
              ))}
            </ul>

            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button
                onClick={() => handleCancel(order.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Cancel order
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function fetchCustomers() {
    fetch('http://127.0.0.1:8000/customers')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch customers')
        return res.json()
      })
      .then((data) => {
        setCustomers(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)

    fetch('http://127.0.0.1:8000/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone: phone || null,
        address: address || null,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Failed to create customer')
        }
        return res.json()
      })
      .then(() => {
        setName('')
        setPhone('')
        setAddress('')
        fetchCustomers()
      })
      .catch((err) => setFormError(err.message))
      .finally(() => setSubmitting(false))
  }

  if (loading) return <p className="text-slate-500">Loading customers...</p>
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Customers</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-8 max-w-md mx-auto space-y-3"
      >
        <h2 className="text-lg font-semibold text-white">Add Customer</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
        />
        <input
          type="text"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
        />
        <input
          type="text"
          placeholder="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
        />

        {formError && <p className="text-red-400 text-sm">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded px-4 py-2"
        >
          {submitting ? 'Adding...' : 'Add Customer'}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            <h2 className="text-lg font-semibold text-white">{customer.name}</h2>
            {customer.phone && (
              <p className="text-slate-400 text-sm">{customer.phone}</p>
            )}
            {customer.address && (
              <p className="text-slate-400 text-sm">{customer.address}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch dashboard')
        return res.json()
      })
      .then((data) => {
        setData(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>
  if (error) return <p className="text-red-500">Error: {error}</p>

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <p className="text-slate-400 text-sm">Today's Sales</p>
          <p className="text-3xl font-bold text-emerald-400">₦{data.todays_sales}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <p className="text-slate-400 text-sm">Today's Orders</p>
          <p className="text-3xl font-bold text-white">{data.todays_order_count}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Low Stock Alerts</h2>
          {data.low_stock_products.length === 0 ? (
            <p className="text-slate-500 text-sm">All products well stocked.</p>
          ) : (
            <ul className="space-y-2">
              {data.low_stock_products.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm bg-red-950 text-red-300 rounded px-3 py-2"
                >
                  <span>{p.name}</span>
                  <span>{p.stock} left</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
          <h2 className="text-lg font-semibold text-white mb-3">Top Selling Products</h2>
          {data.top_products.length === 0 ? (
            <p className="text-slate-500 text-sm">No sales yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.top_products.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm bg-slate-900 text-slate-300 rounded px-3 py-2"
                >
                  <span>{p.name}</span>
                  <span>{p.total_sold} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'orders', label: 'Orders' },
    { id: 'customers', label: 'Customers' },
  ]

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <nav className="flex gap-2 mb-8 border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'products' && <ProductsPage />}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'customers' && <CustomersPage />}
      </div>
    </div>
  )
}

export default App