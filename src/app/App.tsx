import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '../components/layout/AppShell'
import { SignInPage } from '../features/auth/SignInPage'
import { SettingsPage } from '../features/settings/SettingsPage'

import { PhonePurchasePage } from '../features/purchases/PhonePurchasePage'
import { PhoneInventoryPage } from '../features/inventory/PhoneInventoryPage'
import { PhoneDeviceDetailPage } from '../features/inventory/PhoneDeviceDetailPage'
import { PhoneDeviceEditPage } from '../features/inventory/PhoneDeviceEditPage'
import { PhoneDeleteHistoryPage } from '../features/inventory/PhoneDeleteHistoryPage'

import { PublicCatalogPage } from '../features/publicCatalog/PublicCatalogPage'
import { PublicDevicePage } from '../features/publicCatalog/PublicDevicePage'
import { PublicContactPage } from '../features/publicCatalog/PublicContactPage'

import ComputerPurchasePage from '../features/computers/purchases/ComputerPurchasePage'
import ComputerInventoryPage from '../features/computers/inventory/ComputerInventoryPage'
import ComputerDeviceDetailPage from '../features/computers/inventory/ComputerDeviceDetailPage'
import ComputerDeviceEditPage from '../features/computers/inventory/ComputerDeviceEditPage'
import ComputerDeleteHistoryPage from '../features/computers/inventory/ComputerDeleteHistoryPage'
import { PosPage } from '../features/pos/PosPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { ContactsPage } from '../features/contacts/ContactsPage'
import { useAuth } from '../features/auth/AuthProvider'

import { ProtectedRoute, RoleRoute } from './RouteGuards'

import { DashboardPage, NotFoundPage, PublicHomePage } from './pages'

function RoleLanding() {
  const { profile } = useAuth()
  if (profile?.role === 'phone_staff') return <Navigate to="phones" replace />
  if (profile?.role === 'computer_staff') return <Navigate to="computers" replace />
  return <DashboardPage />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}

        <Route path="/" element={<PublicHomePage />} />

        <Route path="/phones" element={<PublicCatalogPage category="phone" />} />

        <Route path="/computers" element={<PublicCatalogPage category="computer" />} />

        <Route path="/products/:publicId" element={<PublicDevicePage />} />

        <Route path="/contact" element={<PublicContactPage />} />

        <Route path="/sign-in" element={<SignInPage />} />

        {/* Protected App */}

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<RoleLanding />} />

            {/* Phone */}

            <Route element={<RoleRoute roles={['owner', 'manager', 'phone_staff']} />}>
              <Route path="phones" element={<PhoneInventoryPage />} />

              <Route path="phones/:deviceId" element={<PhoneDeviceDetailPage />} />

              <Route path="phones/:deviceId/edit" element={<PhoneDeviceEditPage />} />

              <Route path="phones/purchase" element={<PhonePurchasePage />} />

              <Route path="phones/pos" element={<PosPage category="phone" />} />

              <Route element={<RoleRoute roles={['owner', 'manager']} />}>
                <Route path="phones/deleted" element={<PhoneDeleteHistoryPage />} />
              </Route>
            </Route>

            {/* Computer */}

            <Route element={<RoleRoute roles={['owner', 'manager', 'computer_staff']} />}>
              <Route path="computers" element={<ComputerInventoryPage />} />

              <Route path="computers/purchase" element={<ComputerPurchasePage />} />

              <Route path="computers/pos" element={<PosPage category="computer" />} />

              <Route path="computers/:deviceId" element={<ComputerDeviceDetailPage />} />

              <Route
                path="computers/:deviceId/edit"
                element={<ComputerDeviceEditPage />}
              />
              <Route element={<RoleRoute roles={['owner', 'manager']} />}>
                <Route path="computers/deleted" element={<ComputerDeleteHistoryPage />} />
              </Route>
            </Route>

            {/* Reports */}

            <Route
              element={
                <RoleRoute
                  roles={['owner', 'manager', 'phone_staff', 'computer_staff']}
                />
              }
            >
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleRoute roles={['owner', 'manager']} />}>
              <Route path="customers" element={<ContactsPage kind="customer" />} />
              <Route path="suppliers" element={<ContactsPage kind="supplier" />} />
            </Route>

            {/* Owner Settings */}

            <Route element={<RoleRoute roles={['owner', 'manager']} />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Not Found */}

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
