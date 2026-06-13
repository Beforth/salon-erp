import { useSelector } from 'react-redux'
import StaffIncentivesSection from '@/components/StaffIncentivesSection'

export default function StaffIncentivesReport() {
  const { user } = useSelector((state) => state.auth)
  const isOwner = user?.role === 'owner' || user?.role === 'developer'

  return (
    <div className="space-y-6">
      <StaffIncentivesSection showOwnerActions={isOwner} />
    </div>
  )
}
