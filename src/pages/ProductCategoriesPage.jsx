import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { categoryService } from '../services/category.service'

function ProductCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const fetchCategories = async () => {
    try {
      setLoading(true)

      const response =
        await categoryService.getCategories()

      console.log(response.data)

      // Handle backend response safely
      const categoryData =
        response.data?.data ||
        response.data ||
        []

      setCategories(categoryData)
    } catch (error) {
      console.error(
        'Error fetching categories:',
        error
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingCategory) {
        await categoryService.updateCategory(
          editingCategory.category_id,
          formData
        )
      } else {
        await categoryService.createCategory(
          formData
        )
      }

      setShowModal(false)
      setEditingCategory(null)

      setFormData({
        name: '',
        description: '',
      })

      fetchCategories()
    } catch (error) {
      console.error(
        'Save category error:',
        error
      )
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)

    setFormData({
      name: category.name || '',
      description:
        category.description || '',
    })

    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this category?'
    )

    if (!confirmDelete) return

    try {
      await categoryService.deleteCategory(id)
      fetchCategories()
    } catch (error) {
      console.error(
        'Delete category error:',
        error
      )
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Product Categories
        </h1>

        <button
          onClick={() => {
            setEditingCategory(null)
            setFormData({
              name: '',
              description: '',
            })
            setShowModal(true)
          }}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-4">
                Name
              </th>

              <th className="text-left p-4">
                Description
              </th>

              <th className="text-center p-4">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="3"
                  className="text-center p-6"
                >
                  Loading...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="text-center p-6"
                >
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.category_id}
                  className="border-b"
                >
                  <td className="p-4">
                    {category.name}
                  </td>

                  <td className="p-4">
                    {category.description ||
                      '-'}
                  </td>

                  <td className="p-4 flex justify-center gap-4">
                    <button
                      onClick={() =>
                        handleEdit(category)
                      }
                    >
                      <Pencil
                        className="text-blue-500"
                        size={18}
                      />
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(
                          category.category_id
                        )
                      }
                    >
                      <Trash2
                        className="text-red-500"
                        size={18}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl w-[400px] shadow-lg">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory
                ? 'Edit Category'
                : 'Add Category'}
            </h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Category Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                className="w-full border p-3 rounded-lg mb-4"
                required
              />

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description:
                      e.target.value,
                  })
                }
                className="w-full border p-3 rounded-lg mb-4"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCategoriesPage