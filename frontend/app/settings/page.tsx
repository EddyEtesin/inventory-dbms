'use client';



import {

  Building2,

  Check,

  ChevronDown,

  ClipboardList,

  Edit3,

  Power,

  RotateCcw,

  Save,

  ShieldCheck,

  User,

  UserPlus,

  Users,

  X,

} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';



import InventorySidebar from '../../components/inventory/InventorySidebar';

import { apiFetch } from '../../lib/api';

import { useAutoDismissMessage } from '../../hooks/useAutoDismissMessage';



type CurrentUserResponse = {

  user: {

    id: string;

    name: string;

    email: string;

  };

  organization: {

    id: string;

    name: string;

    industryType: string;

    status: string;

    setupStatus?: string;

  };

  role: {

    id: string;

    name: string;

  };

};



type Organization = {

  id: string;

  name: string;

  industryType: string;

  status: string;

  setupStatus?: string;

};



type OrganizationUser = {

  id: string;

  userId: string;

  name: string;

  email: string;

  role: {

    id: string;

    name: string;

    roleType: string;

    description: string | null;

  };

  status: string;

  joinedAt: string;

  userCreatedAt: string;

  updatedAt: string;

};



type Permission = {

  id: string;

  code: string;

  description: string | null;

};



type RoleDefinition = {

  id: string;

  name: string;

  roleType: string;

  description: string | null;

  permissions: Permission[];

};

type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
};




function formatLabel(value: string) {

  return value

    .replace(/\_/g, ' ')

    .replace(/\b\w/g, (letter) =>

      letter.toUpperCase(),

    );

}



function formatAuditAction(action: string) {
  return formatLabel(
    action
      .replace(/^USER_/, 'USER ')
      .replace(/^ORGANIZATION_/, 'ORGANIZATION '),
  );
}

function formatAuditValues(values: Record<string, unknown> | null) {
  if (!values) return '—';
  const entries = Object.entries(values);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => {
      const formattedValue =
        value === null || value === undefined
          ? '—'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);
      return `${formatLabel(key)}: ${formattedValue}`;
    })
    .join(' · ');
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function getRoleSummary(roleName: string) {

  switch (roleName) {

    case 'Owner':

      return 'Full control of the organization.';



    case 'Admin':

      return 'Manage users, inventory operations, and system administration.';



    case 'Manager':

      return 'Manage inventory setup and day-to-day stock operations.';



    case 'Staff':

      return 'Handle routine stock operations and view inventory information.';



    case 'Viewer':

      return 'View inventory information, history, and reports.';



    default:

      return 'System role with defined permissions.';

  }

}



function getPermissionLabel(code: string) {

  const labels: Record<string, string> = {

    'item.view': 'Can View Items',

    'item.create': 'Can Create Items',

    'item.update': 'Can Edit Items',

    'item.archive': 'Can Archive Items',



    'category.view': 'Can View Categories',

    'category.create': 'Can Create Categories',

    'category.update': 'Can Edit Categories',

    'category.delete': 'Can Delete Categories',



    'supplier.view': 'Can View Suppliers',

    'supplier.create': 'Can Create Suppliers',

    'supplier.update': 'Can Edit Suppliers',

    'supplier.delete': 'Can Delete Suppliers',



    'location.view': 'Can View Locations',

    'location.create': 'Can Create Locations',

    'location.update': 'Can Edit Locations',

    'location.delete': 'Can Delete Locations',



    'stock.receive': 'Can Receive Stock',

    'stock.issue': 'Can Issue Stock',

    'stock.adjust': 'Can Adjust Stock',

    'stock.transfer': 'Can Transfer Stock',

    'stock.view_history': 'Can View Stock History',



    'report.view': 'Can View Reports',

    'report.export': 'Can Export Reports',



    'user.view': 'Can View Users',

    'user.invite': 'Can Invite Users',

    'user.update_role': 'Can Change User Roles',

    'user.disable': 'Can Disable or Enable Users',



    'organization.update':

      'Can Edit Organization Settings',

  };



  return (

    labels[code] ??

    formatLabel(code)

  );

}







function getPermissionGroup(code: string) {

  if (

    code.startsWith('item.') ||

    code.startsWith('category.') ||

    code.startsWith('supplier.') ||

    code.startsWith('location.')

  ) {

    return 'INVENTORY';

  }



  if (code.startsWith('stock.')) {

    return 'STOCK';

  }



  if (code.startsWith('user.')) {

    return 'USERS & ACCESS';

  }



  if (code.startsWith('report.')) {

    return 'REPORTS';

  }



  if (code === 'organization.update') {

    return 'ORGANIZATION';

  }



  return 'OTHER';

}



const ROLE_ORDER = [

  'Owner',

  'Admin',

  'Manager',

  'Staff',

  'Viewer',

];



function extractApiError(message: string) {

  try {

    const parsed = JSON.parse(message);



    if (Array.isArray(parsed?.message)) {

      return parsed.message.join(', ');

    }



    if (typeof parsed?.message === 'string') {

      return parsed.message;

    }



    if (typeof parsed?.error === 'string') {

      return parsed.error;

    }

  } catch {

    // Keep original message.

  }



  return message || 'Something went wrong.';

}



export default function SettingsPage() {

  const router = useRouter();



  const [collapsed, setCollapsed] = useState(false);



  const [loading, setLoading] = useState(true);

  const [savingOrganization, setSavingOrganization] =

    useState(false);



  const [

  updatingOrganizationStatus,

  setUpdatingOrganizationStatus,

  ] = useState(false);



  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');



  const [currentUser, setCurrentUser] =

    useState<CurrentUserResponse | null>(null);



  const [organization, setOrganization] =

    useState<Organization | null>(null);



  const [users, setUsers] =

    useState<OrganizationUser[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLogEntry[]>([]);



  const [roles, setRoles] =

    useState<RoleDefinition[]>([]);



  const [editingOrganization, setEditingOrganization] =

    useState(false);



  const [organizationName, setOrganizationName] =

    useState('');



  const [industryType, setIndustryType] =

    useState('');



  const [selectedRoleId, setSelectedRoleId] =

    useState('');



  const [showRoleDetails, setShowRoleDetails] =

    useState(false);



  const [updatingRoleId, setUpdatingRoleId] =

    useState('');



  const [updatingStatusId, setUpdatingStatusId] =

    useState('');



  const [creatingUser, setCreatingUser] =

    useState(false);



  const [newUserName, setNewUserName] =

    useState('');



  const [newUserEmail, setNewUserEmail] =

    useState('');



  const [newUserPassword, setNewUserPassword] =

    useState('');



  const [newUserRoleId, setNewUserRoleId] =

    useState('');



  useAutoDismissMessage(

  error,

  setError,

    );



  useAutoDismissMessage(

    success,

    setSuccess,

  );



  async function loadAdministration() {

    try {

      setLoading(true);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      const me =

        await apiFetch<CurrentUserResponse>(

          '/auth/me',

          token,

        );



      setCurrentUser(me);

      setOrganization(me.organization);

      setOrganizationName(me.organization.name);

      setIndustryType(

        me.organization.industryType,

      );



      const organizationResponse =

        await apiFetch<Organization>(

          '/administration/organization',

          token,

        );



      setOrganization(

        organizationResponse,

      );



      setOrganizationName(

        organizationResponse.name,

      );



      setIndustryType(

        organizationResponse.industryType,

      );



      const rolesResponse =

        await apiFetch<RoleDefinition[]>(

          '/administration/roles',

          token,

        );



      setRoles(rolesResponse);



      setNewUserRoleId(

        (currentValue) =>

          currentValue ||

          rolesResponse.find(

            (role) =>

              role.name === 'Staff',

          )?.id ||

          rolesResponse.find(

            (role) =>

              role.name !== 'Owner',

          )?.id ||

          '',

      );



      const currentRole =

        rolesResponse.find(

          (role) =>

            role.id === me.role.id,

        );



      setSelectedRoleId(

        currentRole?.id ?? '',

      );



      const canViewAdministrationData =
        currentRole?.permissions.some(
          (permission) =>
            permission.code ===
            'user.view',
        ) ?? false;

      if (canViewAdministrationData) {
        const [
          usersResponse,
          auditLogsResponse,
        ] = await Promise.all([
          apiFetch<OrganizationUser[]>(
            '/administration/users',
            token,
          ),
          apiFetch<AuditLogEntry[]>(
            '/administration/audit-logs',
            token,
          ),
        ]);

        setUsers(usersResponse);
        setAuditLogs(auditLogsResponse);
      } else {
        setUsers([]);
        setAuditLogs([]);
      }

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to load settings.',

      );

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    loadAdministration();

  }, [router]);



  const currentRoleDefinition =

    useMemo(

      () =>

        roles.find(

          (role) =>

            role.id ===

            currentUser?.role.id,

        ),

      [

        roles,

        currentUser?.role.id,

      ],

    );



  const hasPermission = (

    permissionCode: string,

  ) =>

    currentRoleDefinition?.permissions.some(

      (permission) =>

        permission.code ===

        permissionCode,

    ) ?? false;



  const canUpdateOrganization =

    hasPermission(

      'organization.update',

    );



  const isOwner =

  currentUser?.role.name === 'Owner';



  const canManageOrganizationStatus =

    isOwner && canUpdateOrganization;



  const canViewUsers =

    hasPermission('user.view');



  const canUpdateRoles =

    hasPermission(

      'user.update_role',

    );



  const canDisableUsers =

    hasPermission(

      'user.disable',

    );



  const canInviteUsers =

    hasPermission(

      'user.invite',

    );



  const selectableRoles =

    roles.filter(

      (role) =>

        role.name !== 'Owner',

    );



  const orderedRoles = [...roles].sort(

    (a, b) =>

      ROLE_ORDER.indexOf(a.name) -

      ROLE_ORDER.indexOf(b.name),

  );



  const selectedRole =

    orderedRoles.find(

      (role) =>

        role.id === selectedRoleId,

    );



  async function saveOrganization() {

    try {

      setSavingOrganization(true);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      const updated =

        await apiFetch<Organization>(

          '/administration/organization',

          token,

          {

            method: 'PATCH',

            body: JSON.stringify({

              name:

                organizationName.trim(),

              industryType:

                industryType.trim(),

            }),

          },

        );



      setOrganization(updated);

      setOrganizationName(

        updated.name,

      );

      setIndustryType(

        updated.industryType,

      );



      setEditingOrganization(false);



      setSuccess(

        'Organization settings saved successfully.',

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to update organization.',

      );

    } finally {

      setSavingOrganization(false);

    }

  }



    async function updateOrganizationStatus(

    status: 'active' | 'suspended',

  ) {

    const isSuspending =

      status === 'suspended';



    const confirmed = window.confirm(

      isSuspending

        ? 'Are you sure you want to suspend this organization? All normal organization access will be blocked until it is reactivated.'

        : 'Are you sure you want to reactivate this organization?',

    );



    if (!confirmed) {

      return;

    }



    try {

      setUpdatingOrganizationStatus(true);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      const response =

        await apiFetch<{

          message: string;

          organization: Organization;

        }>(

          '/administration/organization/status',

          token,

          {

            method: 'PATCH',

            body: JSON.stringify({

              status,

            }),

          },

        );



      setOrganization(

        response.organization,

      );



      setCurrentUser((current) =>

        current

          ? {

              ...current,

              organization: {

                ...current.organization,

                status:

                  response.organization.status,

              },

            }

          : current,

      );



      setSuccess(response.message);

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to update organization status.',

      );

    } finally {

      setUpdatingOrganizationStatus(false);

    }

  }



  async function createUser() {

    if (

      !newUserName.trim() ||

      !newUserEmail.trim() ||

      !newUserPassword ||

      !newUserRoleId

    ) {

      setError(

        'Enter the user name, email, password and role.',

      );

      return;

    }



    try {

      setCreatingUser(true);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      await apiFetch(

        '/administration/users',

        token,

        {

          method: 'POST',

          body: JSON.stringify({

            name: newUserName.trim(),

            email: newUserEmail.trim(),

            password: newUserPassword,

            roleId: newUserRoleId,

          }),

        },

      );



      setNewUserName('');

      setNewUserEmail('');

      setNewUserPassword('');



      await loadAdministration();



      setSuccess(

        'User created and activated successfully.',

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to create user.',

      );

    } finally {

      setCreatingUser(false);

    }

  }



  async function updateUserRole(

    memberId: string,

    roleId: string,

  ) {

    try {

      setUpdatingRoleId(memberId);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      await apiFetch(

        `/administration/users/${memberId}/role`,

        token,

        {

          method: 'PATCH',

          body: JSON.stringify({

            roleId,

          }),

        },

      );



      await loadAdministration();



      setSuccess(

        'User role updated successfully.',

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to update user role.',

      );

    } finally {

      setUpdatingRoleId('');

    }

  }



  async function updateUserStatus(

    memberId: string,

    status: 'active' | 'suspended',

  ) {

    const action =

      status === 'suspended'

        ? 'disable'

        : 'enable';



    const confirmed = window.confirm(

      `Are you sure you want to ${action} this user?`,

    );



    if (!confirmed) {

      return;

    }



    try {

      setUpdatingStatusId(memberId);

      setError('');

      setSuccess('');



      const token =

        window.localStorage.getItem(

          'accessToken',

        );



      if (!token) {

        router.push('/login');

        return;

      }



      await apiFetch(

        `/administration/users/${memberId}/status`,

        token,

        {

          method: 'PATCH',

          body: JSON.stringify({

            status,

          }),

        },

      );



      await loadAdministration();



      setSuccess(

        status === 'suspended'

          ? 'User disabled successfully.'

          : 'User enabled successfully.',

      );

    } catch (err) {

      setError(

        err instanceof Error

          ? extractApiError(

              err.message,

            )

          : 'Unable to update user status.',

      );

    } finally {

      setUpdatingStatusId('');

    }

  }



  return (

    <main className="min-h-screen bg-[#ddd0b8] text-[#2b2620]">

      <InventorySidebar

        collapsed={collapsed}

        onToggle={() =>

          setCollapsed(

            (value) => !value,

          )

        }

      />



      <div

        className={`min-h-screen ${

          collapsed

            ? 'md:pl-[68px]'

            : 'md:pl-[205px]'

        }`}

      >

        <div className="p-3 md:p-5">

          <div className="mx-auto max-w-[1250px]">



            <header className="border border-[#b7a87e] bg-[#f5f0e3] px-5 py-4 shadow-[0_2px_0\_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)]">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <div className="font-mono text-[8px] tracking-[0.18em] text-[#5b5346]">

                    INVENTORY MANAGEMENT SYSTEM

                  </div>



                  <div className="mt-1 font-mono text-[19px] tracking-[0.05em]">

                    SETTINGS

                  </div>

                </div>



                <div className="hidden border-2 border-[#a63a2e] px-2.5 py-1 font-mono text-[7px] tracking-widest text-[#a63a2e] sm:block">

                  ORGANIZATION CONFIGURATION

                </div>

              </div>

            </header>



            <section className="relative mt-4 border border-[#b7a87e] bg-[#f5f0e3] p-5 shadow-[0_2px_0\_#b7a87e,0_8px_20px_rgba(43,38,32,0.12)] md:p-7">

              <div className="pointer-events-none absolute inset-2 border border-dashed border-[#2b2620]/15" />



              <div className="relative">



                <div className="border-b border-dashed border-[#b7a87e] pb-5">

                  <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">

                    SYSTEM SETTINGS

                  </div>



                  <h1 className="mt-1 font-mono text-[28px] leading-tight">

                    Organization & Account

                  </h1>



                  <p className="mt-2 max-w-[800px] font-mono text-[9px] leading-5 text-[#5b5346]">

                    Manage your organization,

                    user access and system

                    permissions.

                  </p>

                </div>



                {error && (

                  <div className="mt-5 border border-[#a63a2e] bg-[#f5f0e3] px-4 py-3 font-mono text-[8px] leading-4 text-[#a63a2e]">

                    {error}

                  </div>

                )}



                {success && (

                  <div className="mt-5 border border-[#5f7d57] bg-[#e8eee1] px-4 py-3 font-mono text-[8px] leading-4 text-[#40583b]">

                    {success}

                  </div>

                )}



                {/* ORGANIZATION */}

                <section className="mt-5">

                  <div className="mb-3 flex items-center justify-between gap-3">

                    <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                      <Building2

                        size={14}

                        strokeWidth={1.6}

                      />

                      ORGANIZATION

                    </div>



                    {canUpdateOrganization &&

                      !editingOrganization && (

                        <button

                          type="button"

                          onClick={() =>

                            setEditingOrganization(

                              true,

                            )

                          }

                          className="flex items-center gap-1.5 border border-[#b7a87e] px-3 py-2 font-mono text-[7px] tracking-widest hover:border-[#2e4057]"

                        >

                          <Edit3

                            size={11}

                          />

                          EDIT

                        </button>

                      )}

                  </div>



                  {editingOrganization ? (

                    <div className="border border-[#b7a87e] p-4">

                      <div className="grid gap-4 md:grid-cols-2">

                        <FormField

                          label="ORGANIZATION NAME"

                          value={

                            organizationName

                          }

                          onChange={

                            setOrganizationName

                          }

                        />



                        <FormField

                          label="INDUSTRY"

                          value={

                            industryType

                          }

                          onChange={

                            setIndustryType

                          }

                        />

                      </div>



                      <div className="mt-4 flex gap-2">

                        <button

                          type="button"

                          disabled={

                            savingOrganization

                          }

                          onClick={

                            saveOrganization

                          }

                          className="flex items-center gap-2 border border-[#2e4057] bg-[#2e4057] px-4 py-2 font-mono text-[7px] tracking-widest text-white disabled:opacity-50"

                        >

                          <Save

                            size={11}

                          />



                          {savingOrganization

                            ? 'SAVING...'

                            : 'SAVE CHANGES'}

                        </button>



                        <button

                          type="button"

                          disabled={

                            savingOrganization

                          }

                          onClick={() => {

                            setEditingOrganization(

                              false,

                            );



                            setOrganizationName(

                              organization?.name ??

                                '',

                            );



                            setIndustryType(

                              organization?.industryType ??

                                '',

                            );

                          }}

                          className="flex items-center gap-2 border border-[#b7a87e] px-4 py-2 font-mono text-[7px] tracking-widest"

                        >

                          <X

                            size={11}

                          />

                          CANCEL

                        </button>

                      </div>

                    </div>

                  ) : (

                    <div className="grid gap-3 md:grid-cols-3">

                      <InfoCard

                        label="NAME"

                        value={

                          loading

                            ? 'LOADING...'

                            : organization?.name ??

                              '—'

                        }

                      />



                      <InfoCard

                        label="INDUSTRY"

                        value={

                          loading

                            ? 'LOADING...'

                            : organization?.industryType

                              ? formatLabel(

                                  organization.industryType,

                                )

                              : '—'

                        }

                      />



                      <InfoCard

                        label="STATUS"

                        value={

                          loading

                            ? 'LOADING...'

                            : organization?.status

                              ? formatLabel(

                                  organization.status,

                                )

                              : '—'

                        }

                      />

                    </div>

                  )}

                                    {canManageOrganizationStatus &&

                    !editingOrganization && (

                      <div className="mt-4 border border-[#a63a2e] bg-[#f5f0e3] p-4">

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                          <div>

                            <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#a63a2e]">

                              <Power

                                size={13}

                                strokeWidth={1.6}

                              />

                              ORGANIZATION ACCESS

                            </div>



                            <p className="mt-2 max-w-[760px] font-mono text-[8px] leading-5 text-[#5b5346]">

                              Suspending the organization blocks normal access for all members. Only the Owner can reactivate it.

                            </p>

                          </div>



                          {organization?.status ===

                          'suspended' ? (

                            <button

                              type="button"

                              disabled={

                                updatingOrganizationStatus

                              }

                              onClick={() =>

                                updateOrganizationStatus(

                                  'active',

                                )

                              }

                              className="flex shrink-0 items-center justify-center gap-2 border border-[#2e4057] bg-[#2e4057] px-4 py-2 font-mono text-[7px] tracking-widest text-white disabled:opacity-50"

                            >

                              <RotateCcw

                                size={11}

                              />



                              {updatingOrganizationStatus

                                ? 'REACTIVATING...'

                                : 'REACTIVATE ORGANIZATION'}

                            </button>

                          ) : (

                            <button

                              type="button"

                              disabled={

                                updatingOrganizationStatus

                              }

                              onClick={() =>

                                updateOrganizationStatus(

                                  'suspended',

                                )

                              }

                              className="flex shrink-0 items-center justify-center gap-2 border border-[#a63a2e] px-4 py-2 font-mono text-[7px] tracking-widest text-[#a63a2e] hover:bg-[#f1dfdb] disabled:opacity-50"

                            >

                              <Power

                                size={11}

                              />



                              {updatingOrganizationStatus

                                ? 'SUSPENDING...'

                                : 'SUSPEND ORGANIZATION'}

                            </button>

                          )}

                        </div>

                      </div>

                    )}

                </section>



                {/* MY ACCOUNT */}

                <section className="mt-6">

                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                    <User

                      size={14}

                      strokeWidth={1.6}

                    />

                    MY ACCOUNT

                  </div>



                  <div className="grid gap-3 md:grid-cols-3">

                    <InfoCard

                      label="NAME"

                      value={

                        loading

                          ? 'LOADING...'

                          : currentUser?.user

                              .name ?? '—'

                      }

                    />



                    <InfoCard

                      label="EMAIL"

                      value={

                        loading

                          ? 'LOADING...'

                          : currentUser?.user

                              .email ?? '—'

                      }

                    />



                    <InfoCard

                      label="ROLE"

                      value={

                        loading

                          ? 'LOADING...'

                          : currentUser?.role

                              .name ?? '—'

                      }

                    />

                  </div>

                </section>



                {/* USERS */}

                {canViewUsers ? (

                  <section className="mt-6">

                    <div className="mb-3 flex items-center justify-between gap-3">

                      <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                        <Users

                          size={14}

                          strokeWidth={1.6}

                        />

                        USERS

                      </div>



                      <div className="flex items-center gap-2">

                        <span className="border border-[#b7a87e] px-2 py-1 font-mono text-[6px] tracking-widest text-[#5b5346]">

                          {users.length}{' '}

                          {users.length === 1

                            ? 'USER'

                            : 'USERS'}

                        </span>



                        {canInviteUsers && (

                          <button

                            type="button"

                            onClick={() => {

                              setError('');

                              setSuccess('');

                              setNewUserRoleId(

                                (currentValue) =>

                                  currentValue ||

                                  selectableRoles.find(

                                    (role) =>

                                      role.name ===

                                      'Staff',

                                  )?.id ||

                                  selectableRoles[0]?.id ||

                                  '',

                              );

                            }}

                            className="flex items-center gap-1.5 border border-[#2e4057] bg-[#2e4057] px-3 py-2 font-mono text-[7px] tracking-widest text-white hover:bg-[#24344a]"

                          >

                            <UserPlus

                              size={11}

                            />

                            ADD USER

                          </button>

                        )}

                      </div>

                    </div>



                    {canInviteUsers && (

                      <div className="mb-4 border border-[#b7a87e] bg-[#eae2ce] p-4">

                        <div className="font-mono text-[8px] tracking-widest text-[#5b5346]">

                          CREATE ORGANIZATION USER

                        </div>



                        <p className="mt-1 max-w-[850px] font-mono text-[7px] leading-4 text-[#5b5346]">

                          This currently creates an active user directly for RBAC testing.

                          Email invitation delivery is not connected yet.

                        </p>



                        <div className="mt-4 grid gap-3 md:grid-cols-2">

                          <FormField

                            label="FULL NAME"

                            value={newUserName}

                            onChange={setNewUserName}

                          />



                          <FormField

                            label="EMAIL"

                            value={newUserEmail}

                            onChange={setNewUserEmail}

                          />



                          <label className="block">

                            <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">

                              INITIAL PASSWORD

                            </span>



                            <input

                              type="password"

                              value={newUserPassword}

                              onChange={(event) =>

                                setNewUserPassword(

                                  event.target.value,

                                )

                              }

                              placeholder="Minimum 8 characters"

                              className="mt-1 w-full border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2.5 font-mono text-[9px] outline-none focus:border-[#2e4057]"

                            />

                          </label>



                          <label className="block">

                            <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">

                              ROLE

                            </span>



                            <select

                              value={newUserRoleId}

                              onChange={(event) =>

                                setNewUserRoleId(

                                  event.target.value,

                                )

                              }

                              className="mt-1 w-full border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2.5 font-mono text-[9px] outline-none focus:border-[#2e4057]"

                            >

                              <option value="">

                                SELECT ROLE

                              </option>



                              {selectableRoles.map(

                                (role) => (

                                  <option

                                    key={role.id}

                                    value={role.id}

                                  >

                                    {role.name}

                                  </option>

                                ),

                              )}

                            </select>

                          </label>

                        </div>



                        <div className="mt-4 flex gap-2">

                          <button

                            type="button"

                            disabled={creatingUser}

                            onClick={createUser}

                            className="flex items-center gap-2 border border-[#2e4057] bg-[#2e4057] px-4 py-2 font-mono text-[7px] tracking-widest text-white disabled:opacity-50"

                          >

                            {creatingUser

                              ? 'CREATING...'

                              : 'CREATE USER'}

                          </button>



                          <button

                            type="button"

                            disabled={creatingUser}

                            onClick={() => {

                              setNewUserName('');

                              setNewUserEmail('');

                              setNewUserPassword('');

                              setNewUserRoleId(

                                selectableRoles.find(

                                  (role) =>

                                    role.name ===

                                    'Staff',

                                )?.id ||

                                  selectableRoles[0]?.id ||

                                  '',

                              );

                            }}

                            className="border border-[#b7a87e] px-4 py-2 font-mono text-[7px] tracking-widest"

                          >

                            CLEAR

                          </button>

                        </div>

                      </div>

                    )}



                    <div className="overflow-x-auto border border-[#b7a87e]">

                      <table className="w-full min-w-[850px] border-collapse">

                        <thead>

                          <tr className="border-b border-[#b7a87e] bg-[#eae2ce]">

                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest">

                              USER

                            </th>



                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest">

                              EMAIL

                            </th>



                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest">

                              ROLE

                            </th>



                            <th className="px-4 py-3 text-left font-mono text-[7px] tracking-widest">

                              STATUS

                            </th>



                            <th className="px-4 py-3 text-right font-mono text-[7px] tracking-widest">

                              ACTIONS

                            </th>

                          </tr>

                        </thead>



                        <tbody>

                          {users.map(

                            (member) => {

                              const isOwner =

                                member.role

                                  .name ===

                                'Owner';



                              const isCurrentUser =

                                member.userId ===

                                currentUser

                                  ?.user.id;



                              return (

                                <tr

                                  key={

                                    member.id

                                  }

                                  className="border-b border-[#d2c6aa] last:border-b-0"

                                >

                                  <td className="px-4 py-3">

                                    <div className="font-mono text-[9px]">

                                      {

                                        member.name

                                      }

                                    </div>



                                    {isCurrentUser && (

                                      <div className="mt-1 font-mono text-[6px] tracking-widest text-[#5b5346]">

                                        CURRENT USER

                                      </div>

                                    )}

                                  </td>



                                  <td className="px-4 py-3 font-mono text-[8px] text-[#5b5346]">

                                    {

                                      member.email

                                    }

                                  </td>



                                  <td className="px-4 py-3">

                                    {canUpdateRoles &&

                                    !isOwner ? (

                                      <div className="relative inline-block">

                                        <select

                                          value={

                                            member.role

                                              .id

                                          }

                                          disabled={

                                            updatingRoleId ===

                                            member.id

                                          }

                                          onChange={(

                                            event,

                                          ) =>

                                            updateUserRole(

                                              member.id,

                                              event

                                                .target

                                                .value,

                                            )

                                          }

                                          className="appearance-none border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2 pr-7 font-mono text-[8px] outline-none"

                                        >

                                          {selectableRoles.map(

                                            (

                                              roleOption,

                                            ) => (

                                              <option

                                                key={

                                                  roleOption.id

                                                }

                                                value={

                                                  roleOption.id

                                                }

                                              >

                                                {

                                                  roleOption.name

                                                }

                                              </option>

                                            ),

                                          )}

                                        </select>



                                        <ChevronDown

                                          size={11}

                                          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"

                                        />

                                      </div>

                                    ) : (

                                      <span className="font-mono text-[8px]">

                                        {

                                          member

                                            .role

                                            .name

                                        }

                                      </span>

                                    )}

                                  </td>



                                  <td className="px-4 py-3">

                                    <span

                                      className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[6px] tracking-widest ${

                                        member.status ===

                                        'active'

                                          ? 'border-[#5f7d57] text-[#40583b]'

                                          : 'border-[#a63a2e] text-[#a63a2e]'

                                      }`}

                                    >

                                      {member.status ===

                                        'active' && (

                                        <Check

                                          size={

                                            9

                                          }

                                        />

                                      )}



                                      {formatLabel(

                                        member.status,

                                      )}

                                    </span>

                                  </td>



                                  <td className="px-4 py-3 text-right">

                                    {!isOwner &&

                                      !isCurrentUser &&

                                      canDisableUsers && (

                                        <button

                                          type="button"

                                          disabled={

                                            updatingStatusId ===

                                            member.id

                                          }

                                          onClick={() =>

                                            updateUserStatus(

                                              member.id,

                                              member.status ===

                                                'active'

                                                ? 'suspended'

                                                : 'active',

                                            )

                                          }

                                          className="border border-[#b7a87e] px-3 py-2 font-mono text-[6px] tracking-widest hover:border-[#a63a2e]"

                                        >

                                          {updatingStatusId ===

                                          member.id

                                            ? 'UPDATING...'

                                            : member.status ===

                                                'active'

                                              ? 'DISABLE'

                                              : 'ENABLE'}

                                        </button>

                                      )}

                                  </td>

                                </tr>

                              );

                            },

                          )}

                        </tbody>

                      </table>

                    </div>

                  </section>

                ) : (

                  <section className="mt-6">

                    <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                      <ShieldCheck

                        size={14}

                        strokeWidth={1.6}

                      />

                      USERS & ACCESS

                    </div>



                    <StatusCard

                      title="USER MANAGEMENT"

                      description="Your current role does not have permission to view organization users."

                    />

                  </section>

                )}



                {/* ROLES & PERMISSIONS */}

                {canViewUsers && (

                  <section className="mt-6">

                    <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                      <ShieldCheck

                        size={14}

                        strokeWidth={1.6}

                      />

                      ROLES & PERMISSIONS

                    </div>



                    <div className="grid gap-3 md:grid-cols-2">

                      {orderedRoles.map(

                        (role) => (

                          <button

                            key={role.id}

                            type="button"

                            onClick={() => {

                              setSelectedRoleId(

                                role.id,

                              );

                              setShowRoleDetails(

                                true,

                              );

                            }}

                            className="group border border-[#b7a87e] bg-[#f5f0e3] p-4 text-left transition-colors hover:border-[#2e4057] hover:bg-[#eee7d6]"

                          >

                            <div className="flex items-start justify-between gap-4">

                              <div>

                                <div className="font-mono text-[11px]">

                                  {

                                    role.name

                                  }

                                </div>



                                <p className="mt-2 font-mono text-[8px] leading-5 text-[#5b5346]">

                                  {getRoleSummary(

                                    role.name,

                                  )}

                                </p>

                              </div>



                              <span className="shrink-0 border border-[#b7a87e] px-2 py-1 font-mono text-[6px] tracking-widest text-[#5b5346] group-hover:border-[#2e4057]">

                                VIEW DETAILS

                              </span>

                            </div>

                          </button>

                        ),

                      )}

                    </div>



                    <div className="mt-3 border border-dashed border-[#b7a87e] bg-[#eae2ce] px-4 py-3 font-mono text-[7px] leading-5 text-[#5b5346]">

                      Stockpile currently uses fixed

                      system roles. Custom role creation

                      and custom permission editing are

                      not enabled.

                    </div>

                  </section>

                )}



                {/* INVITATIONS */}

                <section className="mt-6">

                  <div className="mb-3 flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">

                    <User

                      size={14}

                      strokeWidth={1.6}

                    />

                    INVITATIONS

                  </div>



                  <StatusCard

                    title="EMAIL INVITATIONS"

                    description="Email invitation delivery is not connected yet. Organization users can currently be created directly from the USERS section for access and RBAC testing."

                  />

                </section>



                {/* AUDIT LOG */}
                {canViewUsers && (
                  <section className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest text-[#5b5346]">
                        <ClipboardList size={14} strokeWidth={1.6} />
                        AUDIT LOG
                      </div>
                      <div className="font-mono text-[7px] tracking-widest text-[#8a7f6b]">
                        LATEST {auditLogs.length}
                      </div>
                    </div>

                    <div className="border border-[#b7a87e] bg-[#f5f0e3]">
                      {auditLogs.length === 0 ? (
                        <div className="px-4 py-8 text-center font-mono text-[8px] text-[#5b5346]">
                          No audit records yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-dashed divide-[#b7a87e]">
                          {auditLogs.map((log) => (
                            <div key={log.id} className="px-4 py-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="border border-[#2e4057] bg-[#e9edf2] px-2 py-1 font-mono text-[7px] tracking-widest text-[#2e4057]">
                                      {formatAuditAction(log.action)}
                                    </span>
                                    <span className="font-mono text-[7px] tracking-widest text-[#8a7f6b]">
                                      {formatLabel(log.entityType)}
                                    </span>
                                  </div>
                                  <div className="mt-2 font-mono text-[8px] text-[#2b2620]">
                                    {log.user?.name ?? 'System'}
                                  </div>
                                  {log.user?.email && (
                                    <div className="mt-0.5 font-mono text-[7px] text-[#8a7f6b]">
                                      {log.user.email}
                                    </div>
                                  )}
                                </div>
                                <div className="shrink-0 font-mono text-[7px] text-[#8a7f6b] lg:text-right">
                                  {formatAuditDate(log.createdAt)}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="border border-dashed border-[#b7a87e] bg-[#eae2ce] p-3">
                                  <div className="font-mono text-[7px] tracking-widest text-[#8a7f6b]">
                                    PREVIOUS VALUE
                                  </div>
                                  <div className="mt-2 break-words font-mono text-[7px] leading-5 text-[#5b5346]">
                                    {formatAuditValues(log.oldValues)}
                                  </div>
                                </div>
                                <div className="border border-dashed border-[#b7a87e] bg-[#eae2ce] p-3">
                                  <div className="font-mono text-[7px] tracking-widest text-[#8a7f6b]">
                                    NEW VALUE
                                  </div>
                                  <div className="mt-2 break-words font-mono text-[7px] leading-5 text-[#5b5346]">
                                    {formatAuditValues(log.newValues)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 font-mono text-[7px] leading-4 text-[#8a7f6b]">
                      Showing the latest audit events for this organization.
                    </div>
                  </section>
                )}

                <div className="mt-6 border border-dashed border-[#b7a87e] bg-[#eae2ce] px-4 py-3">

                  <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">

                    CURRENT ADMINISTRATION CAPABILITY

                  </div>



                  <p className="mt-1 font-mono text-[8px] leading-5 text-[#5b5346]">

                    Organization settings,

                    organization users, system roles,

                    role permissions and user

                    activation controls are connected

                    to the administration backend.

                  </p>

                </div>

              </div>

            </section>



            <footer className="mt-3 border-t border-dashed border-[#b7a87e] pt-2 font-mono text-[7px] text-[#5b5346]">

              <div className="flex justify-between gap-4">

                <span>

                  INVENTORY LEDGER · SETTINGS

                </span>



                <span>

                  {organization?.name ??

                    'ORGANIZATION'}

                </span>

              </div>

            </footer>

          </div>

        </div>

      </div>



      {/* ROLE DETAILS OVERLAY */}

      {showRoleDetails &&

        selectedRole && (

          <div

            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2620]/45 p-4"

            onClick={() =>

              setShowRoleDetails(false)

            }

          >

            <div

              className="relative flex max-h-[88vh] w-full max-w-[900px] flex-col border border-[#b7a87e] bg-[#f5f0e3] shadow-[0_10px_40px_rgba(43,38,32,0.3)]"

              onClick={(event) =>

                event.stopPropagation()

              }

            >

              {/* HEADER */}

              <div className="shrink-0 border-b border-[#b7a87e] bg-[#f5f0e3] px-5 py-4">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <div className="font-mono text-[8px] tracking-widest text-[#a63a2e]">

                      ROLE DETAILS

                    </div>



                    <h2 className="mt-1 font-mono text-[20px]">

                      {selectedRole.name}

                    </h2>



                    <p className="mt-2 max-w-[650px] font-mono text-[8px] leading-5 text-[#5b5346]">

                      {getRoleSummary(

                        selectedRole.name,

                      )}

                    </p>

                  </div>



                  <button

                    type="button"

                    onClick={() =>

                      setShowRoleDetails(false)

                    }

                    className="border border-[#b7a87e] p-2 hover:border-[#a63a2e]"

                    aria-label="Close role details"

                  >

                    <X size={14} />

                  </button>

                </div>

              </div>



              {/* PERMISSIONS */}

              <div className="overflow-y-auto p-5">

                <div className="mb-4 font-mono text-[8px] tracking-widest text-[#5b5346]">

                  WHAT THIS ROLE CAN DO

                </div>



                {[

                  'INVENTORY',

                  'STOCK',

                  'USERS & ACCESS',

                  'REPORTS',

                  'ORGANIZATION',

                ].map((group) => {

                  const groupPermissions =

                    selectedRole.permissions.filter(

                      (permission) =>

                        getPermissionGroup(

                          permission.code,

                        ) === group,

                    );



                  if (

                    groupPermissions.length === 0

                  ) {

                    return null;

                  }



                  return (

                    <section

                      key={group}

                      className="mb-5 last:mb-0"

                    >

                      <div className="mb-2 border-b border-dashed border-[#b7a87e] pb-2 font-mono text-[7px] font-semibold tracking-widest text-[#5b5346]">

                        {group}

                      </div>



                      <div className="grid gap-2 sm:grid-cols-2">

                        {groupPermissions.map(

                          (permission) => (

                            <div

                              key={

                                permission.id

                              }

                              className="flex items-start gap-2 border border-[#d2c6aa] bg-[#faf6eb] px-3 py-2.5"

                            >

                              <Check

                                size={11}

                                className="mt-0.5 shrink-0 text-[#40583b]"

                              />



                              <span className="font-mono text-[8px] leading-4">

                                {getPermissionLabel(

                                  permission.code,

                                )}

                              </span>

                            </div>

                          ),

                        )}

                      </div>

                    </section>

                  );

                })}

              </div>



              {/* FOOTER */}

              <div className="shrink-0 border-t border-dashed border-[#b7a87e] bg-[#eae2ce] px-5 py-3">

                <div className="font-mono text-[7px] font-semibold tracking-widest text-[#5b5346]">

                  SYSTEM ROLE

                </div>



                <div className="mt-1 font-mono text-[8px] leading-4 text-[#5b5346]">

                  This role is predefined by

                  Stockpile and cannot currently

                  be edited.

                </div>

              </div>

            </div>

          </div>

        )}

    </main>

  );

}



function InfoCard({

  label,

  value,

}: {

  label: string;

  value: string;

}) {

  return (

    <div className="border border-[#b7a87e] bg-[#f5f0e3] p-4">

      <div className="font-mono text-[7px] tracking-widest text-[#5b5346]">

        {label}

      </div>



      <div className="mt-1 break-words font-mono text-[11px]">

        {value}

      </div>

    </div>

  );

}



function FormField({

  label,

  value,

  onChange,

}: {

  label: string;

  value: string;

  onChange: (value: string) => void;

}) {

  return (

    <label className="block">

      <span className="font-mono text-[7px] tracking-widest text-[#5b5346]">

        {label}

      </span>



      <input

        value={value}

        onChange={(event) =>

          onChange(

            event.target.value,

          )

        }

        className="mt-1 w-full border border-[#b7a87e] bg-[#f5f0e3] px-3 py-2.5 font-mono text-[9px] outline-none focus:border-[#2e4057]"

      />

    </label>

  );

}



function StatusCard({

  title,

  description,

}: {

  title: string;

  description: string;

}) {

  return (

    <div className="border border-[#b7a87e] p-4">

      <div className="flex items-center justify-between gap-3">

        <div className="font-mono text-[9px]">

          {title}

        </div>



        <span className="border border-[#c68a2e] px-2 py-1 font-mono text-[6px] tracking-widest text-[#9b681b]">

          NOT AVAILABLE

        </span>

      </div>



      <p className="mt-2 font-mono text-[8px] leading-5 text-[#5b5346]">

        {description}

      </p>

    </div>

  );

}