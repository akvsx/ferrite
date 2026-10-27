WITH all_permissions AS (
  SELECT unnest(ARRAY[
    'products.read', 'products.create', 'products.update', 'products.delete',
    'categories.read', 'categories.create', 'categories.update', 'categories.delete',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'staff.read', 'staff.create', 'staff.update', 'staff.delete',
    'store.read', 'store.create', 'store.update', 'store.delete',
    'orders.read', 'orders.create', 'orders.update', 'orders.delete', 'orders.refund', 'orders.cancel', 'orders.fulfill',
    'returns.read', 'returns.update', 'returns.approve', 'returns.reject',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.adjust', 'inventory.transfer',
    'reports.read',
    'logs.read',
    'settings.read', 'settings.update'
  ]::permission_key[]) AS permission_key
),
role AS (
  INSERT INTO store_roles (id, store_id, name, description, is_system, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    {{store_id}},
    'Seeded Admin',
    'Role with all permissions',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (store_id, name) DO UPDATE SET updated_at = NOW()
  RETURNING id AS role_id, store_id
),
permissions_granted AS (
  INSERT INTO store_role_permissions (store_role_id, permission_key, granted_at)
  SELECT role.role_id, all_permissions.permission_key, NOW()
  FROM role, all_permissions
  ON CONFLICT (store_role_id, permission_key) DO NOTHING
)
INSERT INTO store_members (
  store_id,
  user_id,
  role_id,
  is_owner,
  joined_at,
  created_at,
  updated_at,
  suspended_at
)
SELECT
  role.store_id,
  {{user_id}},
  role.role_id,
  false,
  NOW(),
  NOW(),
  NOW(),
  NULL
FROM role
ON CONFLICT (store_id, user_id) DO UPDATE SET
  role_id = EXCLUDED.role_id,
  is_owner = EXCLUDED.is_owner,
  updated_at = NOW();
