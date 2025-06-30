import { PanelRegistrationForm } from '@/components/panels/PanelRegistrationForm'
import { AdminLayout } from '@/layouts/AdminLayout'

export default function AdminPanelRegistration() {
  return (
    <AdminLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Enregistrement de Panel</h1>
        <PanelRegistrationForm />
      </div>
    </AdminLayout>
  )
}