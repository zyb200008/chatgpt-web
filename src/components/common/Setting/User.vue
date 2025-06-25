<script lang="ts" setup>
import type { DataTableColumns } from 'naive-ui'
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NDataTable, NInput, NInputNumber, NModal, NSelect, NSpace, NSwitch, NTag, useDialog, useMessage } from 'naive-ui'
import { Status, UserInfo, UserRole, userRoleOptions } from './model'
import { fetchDisableUser2FAByAdmin, fetchGetUsers, fetchUpdateAllUsersChatModel, fetchUpdateMultipleUsersChatModel, fetchUpdateUser, fetchUpdateUserStatus, fetchUpdateUsersChatModelByRole } from '@/api'
import { t } from '@/locales'
import { useBasicLayout } from '@/hooks/useBasicLayout'

const ms = useMessage()
const dialog = useDialog()
const { isMobile } = useBasicLayout()
const loading = ref(false)
const show = ref(false)
const handleSaving = ref(false)
const userRef = ref(new UserInfo([UserRole.User]))

// 批量模型管理相关状态
const showBatchModelModal = ref(false)
const batchModelSaving = ref(false)
const selectedUserIds = ref<string[]>([])
const batchChatModel = ref('gpt-4.1-nano')
const batchOperationType = ref<'all' | 'selected' | 'role'>('all')
const selectedRoles = ref<UserRole[]>([])

// 可用的模型选项
const chatModelOptions = [
  { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
  { label: 'GPT-4.1', value: 'gpt-4.1' },
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
]

const users = ref([])

function createColumns(): DataTableColumns {
  return [
    {
      title: 'Email',
      key: 'email',
      resizable: true,
      width: 200,
      minWidth: 80,
      maxWidth: 200,
    },
    {
      title: 'Register Time',
      key: 'createTime',
      resizable: true,
      width: 200,
      minWidth: 80,
      maxWidth: 200,
    },
    {
      title: 'Verify Time',
      key: 'verifyTime',
      resizable: true,
      width: 200,
      minWidth: 80,
      maxWidth: 200,
    },
    {
      title: 'Roles',
      key: 'status',
      resizable: true,
      width: 200,
      minWidth: 80,
      maxWidth: 200,
      render(row: any) {
        const roles = row.roles.map((role: UserRole) => {
          return h(
            NTag,
            {
              style: {
                marginRight: '6px',
              },
              type: 'info',
              bordered: false,
            },
            {
              default: () => UserRole[role],
            },
          )
        })
        return roles
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 80,
      render(row: any) {
        return Status[row.status]
      },
    },
    {
      title: 'Remark',
      key: 'remark',
      resizable: true,
      width: 200,
      minWidth: 80,
      maxWidth: 200,
    },
    // switch off amt limit
    {
      title: 'Limit Enabled',
      key: 'limit_switch',
      resizable: true,
      width: 100,
      minWidth: 30,
      maxWidth: 100,
      render(row: any) {
        return h('div', row.limit_switch ? 'True' : 'False')
      },
    },
    // 新增额度信息
    {
      title: 'Amounts',
      key: 'useAmount',
      resizable: true,
      width: 80,
      minWidth: 30,
      maxWidth: 100,
    },
    // 添加模型列
    {
      title: 'Chat Model',
      key: 'config.chatModel',
      resizable: true,
      width: 150,
      minWidth: 100,
      maxWidth: 200,
      render(row: any) {
        return row.config?.chatModel || 'gpt-4.1-nano'
      },
    },
    {
      title: 'Action',
      key: '_id',
      width: 220,
      fixed: 'right',
      render(row: any) {
        const actions: any[] = []
        actions.push(h(
          NButton,
          {
            size: 'small',
            type: 'error',
            style: {
              marginRight: '6px',
            },
            onClick: () => handleUpdateUserStatus(row._id, Status.Deleted),
          },
          { default: () => t('common.delete') },
        ))
        if (row.status === Status.Normal) {
          actions.push(h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              style: {
                marginRight: '8px',
              },
              onClick: () => handleEditUser(row),
            },
            { default: () => t('chat.editUser') },
          ))
        }
        if (row.status === Status.PreVerify || row.status === Status.AdminVerify) {
          actions.push(h(
            NButton,
            {
              size: 'small',
              type: 'info',
              onClick: () => handleUpdateUserStatus(row._id, Status.Normal),
            },
            { default: () => t('chat.verifiedUser') },
          ))
        }
        if (row.secretKey) {
          actions.push(h(
            NButton,
            {
              size: 'small',
              type: 'warning',
              onClick: () => handleDisable2FA(row._id),
            },
            { default: () => t('chat.disable2FA') },
          ))
        }
        return actions
      },
    },
  ]
}

const columns = createColumns()

const pagination = reactive ({
  page: 1,
  pageSize: 25,
  pageCount: 1,
  itemCount: 1,
  prefix({ itemCount }: { itemCount: number | undefined }) {
    return `Total is ${itemCount}.`
  },
  showSizePicker: true,
  pageSizes: [25, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
    handleGetUsers(pagination.page)
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    handleGetUsers(pagination.page)
  },
})

async function handleGetUsers(page: number) {
  if (loading.value)
    return
  users.value.length = 0
  loading.value = true
  const size = pagination.pageSize
  const data = (await fetchGetUsers(page, size)).data
  data.users.forEach((user: never) => {
    users.value.push(user)
  })
  pagination.page = page
  pagination.pageCount = data.total / size + (data.total % size === 0 ? 0 : 1)
  pagination.itemCount = data.total
  loading.value = false
}

async function handleUpdateUserStatus(userId: string, status: Status) {
  if (status === Status.Deleted) {
    dialog.warning({
      title: t('chat.deleteUser'),
      content: t('chat.deleteUserConfirm'),
      positiveText: t('common.yes'),
      negativeText: t('common.no'),
      onPositiveClick: async () => {
        await fetchUpdateUserStatus(userId, status)
        ms.info('OK')
        await handleGetUsers(pagination.page)
      },
    })
  }
  else {
    await fetchUpdateUserStatus(userId, status)
    ms.info('OK')
    await handleGetUsers(pagination.page)
  }
}

async function handleDisable2FA(userId: string) {
  dialog.warning({
    title: t('chat.disable2FA'),
    content: t('chat.disable2FAConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      const result = await fetchDisableUser2FAByAdmin(userId)
      ms.success(result.message as string)
      await handleGetUsers(pagination.page)
    },
  })
}

function handleNewUser() {
  userRef.value = new UserInfo([UserRole.User])
  show.value = true
}

function handleEditUser(user: UserInfo) {
  userRef.value = user
  // 确保config对象存在
  if (!userRef.value.config)
    userRef.value.config = { chatModel: 'gpt-4.1-nano' }

  if (!userRef.value.config.chatModel)
    userRef.value.config.chatModel = 'gpt-4.1-nano'

  show.value = true
}

async function handleUpdateUser() {
  handleSaving.value = true
  try {
    await fetchUpdateUser(userRef.value)
    await handleGetUsers(pagination.page)
    show.value = false
  }
  catch (error: any) {
    ms.error(error.message)
  }
  handleSaving.value = false
}

// 批量模型管理功能
function handleBatchModelManagement() {
  selectedUserIds.value = []
  batchChatModel.value = 'gpt-4.1-nano'
  batchOperationType.value = 'all'
  selectedRoles.value = []
  showBatchModelModal.value = true
}

async function handleBatchUpdateChatModel() {
  if (!batchChatModel.value) {
    ms.error('请选择模型 | Please select a model')
    return
  }

  batchModelSaving.value = true
  try {
    let result
    if (batchOperationType.value === 'all') {
      result = await fetchUpdateAllUsersChatModel(batchChatModel.value)
    }
    else if (batchOperationType.value === 'selected') {
      if (selectedUserIds.value.length === 0) {
        ms.error('请选择要更新的用户 | Please select users to update')
        return
      }
      result = await fetchUpdateMultipleUsersChatModel(selectedUserIds.value, batchChatModel.value)
    }
    else if (batchOperationType.value === 'role') {
      if (selectedRoles.value.length === 0) {
        ms.error('请选择用户角色 | Please select user roles')
        return
      }
      result = await fetchUpdateUsersChatModelByRole(selectedRoles.value, batchChatModel.value)
    }

    ms.success(result.message as string)
    showBatchModelModal.value = false
    await handleGetUsers(pagination.page)
  }
  catch (error: any) {
    ms.error(error.message)
  }
  batchModelSaving.value = false
}

function handleUserSelection(rowKeys: string[]) {
  selectedUserIds.value = rowKeys
}

onMounted(async () => {
  await handleGetUsers(pagination.page)
})
</script>

<template>
  <div class="p-4 space-y-5 min-h-[200px]">
    <div class="space-y-6">
      <NSpace vertical :size="12">
        <NSpace>
          <NButton @click="handleNewUser()">
            New User
          </NButton>
          <NButton type="primary" @click="handleBatchModelManagement()">
            批量模型管理 | Batch Model Management
          </NButton>
        </NSpace>
        <NDataTable
          remote
          :loading="loading"
          :row-key="(rowData) => rowData._id"
          :columns="columns"
          :data="users"
          :pagination="pagination"
          :max-height="444"
          striped
          :scroll-x="1800"
          checkable
          :checked-row-keys="selectedUserIds"
          @update:checked-row-keys="handleUserSelection"
          @update:page="handleGetUsers"
        />
      </NSpace>
    </div>
  </div>

  <NModal v-model:show="show" :auto-focus="false" preset="card" :style="{ width: !isMobile ? '33%' : '100%' }">
    <div class="p-4 space-y-5 min-h-[200px]">
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.email') }}</span>
          <div class="flex-1">
            <NInput
              v-model:value="userRef.email"
              :disabled="userRef._id !== undefined" placeholder="email"
            />
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.password') }}</span>
          <div class="flex-1">
            <NInput
              v-model:value="userRef.password"
              type="password"
              placeholder="password"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.userRoles') }}</span>
          <div class="flex-1">
            <NSelect
              style="width: 100%"
              multiple
              :value="userRef.roles"
              :options="userRoleOptions"
              @update-value="value => userRef.roles = value"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.remark') }}</span>
          <div class="flex-1">
            <NInput
              v-model:value="userRef.remark" type="textarea"
              :autosize="{ minRows: 1, maxRows: 2 }" placeholder=""
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.useAmount') }}</span>
          <div class="flex-1">
            <NInputNumber
              v-model:value="userRef.useAmount"
              :autosize="{ minRows: 1, maxRows: 2 }" placeholder=""
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">Chat Model</span>
          <div class="flex-1">
            <NSelect
              v-model:value="userRef.config.chatModel"
              :options="chatModelOptions"
              placeholder="选择聊天模型 | Select chat model"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">{{ $t('setting.limit_switch') }}</span>
          <div class="flex-1">
            <NSwitch
              v-model:value="userRef.limit_switch"
              :round="false"
              @update:value="(val) => { if (userRef) userRef.limit_switch = val }"
            />
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]" />
          <NButton type="primary" :loading="handleSaving" @click="handleUpdateUser()">
            {{ $t('common.save') }}
          </NButton>
        </div>
      </div>
    </div>
  </NModal>

  <!-- 批量模型管理模态框 -->
  <NModal v-model:show="showBatchModelModal" :auto-focus="false" preset="card" title="批量模型管理 | Batch Model Management" :style="{ width: !isMobile ? '50%' : '100%' }">
    <div class="p-4 space-y-5 min-h-[300px]">
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">操作类型</span>
          <div class="flex-1">
            <NSelect
              v-model:value="batchOperationType"
              :options="[
                { label: '所有用户 | All Users', value: 'all' },
                { label: '选中用户 | Selected Users', value: 'selected' },
                { label: '按角色 | By Role', value: 'role' },
              ]"
            />
          </div>
        </div>

        <div v-if="batchOperationType === 'selected'" class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">选中用户</span>
          <div class="flex-1">
            <span class="text-sm text-gray-600">
              已选择 {{ selectedUserIds.length }} 个用户 | {{ selectedUserIds.length }} users selected
            </span>
          </div>
        </div>

        <div v-if="batchOperationType === 'role'" class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">用户角色</span>
          <div class="flex-1">
            <NSelect
              v-model:value="selectedRoles"
              multiple
              :options="userRoleOptions"
              placeholder="请选择用户角色 | Select user roles"
            />
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]">目标模型</span>
          <div class="flex-1">
            <NSelect
              v-model:value="batchChatModel"
              :options="chatModelOptions"
              placeholder="请选择模型 | Select model"
            />
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <span class="flex-shrink-0 w-[100px]" />
          <NButton type="primary" :loading="batchModelSaving" @click="handleBatchUpdateChatModel()">
            {{ $t('common.save') }}
          </NButton>
        </div>
      </div>
    </div>
  </NModal>
</template>
