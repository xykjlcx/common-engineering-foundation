import type { MenuRecord } from './types';

export const demoMenuSeedBySubsystem: Record<string, MenuRecord[]> = {
  "admin": [
    {
      "id": "46dcacb9-8f16-51de-b4f8-66dcf83085a6",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "企业概览",
        "en-US": "Company overview"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "layout-dashboard",
      "path": "/admin/dashboard"
    },
    {
      "id": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "parentId": "e77751c5-5d9b-55c7-a4a1-c9edce4fab39",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "用户管理",
        "en-US": "Users"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "users",
      "path": "/admin/users",
      "permission": "iam:user:view"
    },
    {
      "id": "8e4234c2-d9a2-5a6f-a08e-fda0e0be2a5b",
      "parentId": "e77751c5-5d9b-55c7-a4a1-c9edce4fab39",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "组织架构",
        "en-US": "Organization"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "folder",
      "path": "/admin/depts",
      "permission": "iam:dept:view"
    },
    {
      "id": "03a08c09-8922-530f-ae1d-49b40ca5c84a",
      "parentId": "14f79652-5cee-538a-a9cc-fad99f53cf25",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "角色与权限",
        "en-US": "Roles & Permissions"
      },
      "visible": true,
      "sort": 4,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "shield",
      "path": "/admin/roles",
      "permission": "iam:role:view"
    },
    {
      "id": "fde7c64f-b2cc-5799-9a5f-8c5b5bec4326",
      "parentId": "14f79652-5cee-538a-a9cc-fad99f53cf25",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "菜单",
        "en-US": "Menus"
      },
      "visible": true,
      "sort": 5,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "menu",
      "path": "/admin/menus",
      "permission": "iam:menu:view"
    },
    {
      "id": "e77751c5-5d9b-55c7-a4a1-c9edce4fab39",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "dir",
      "label": {
        "zh-CN": "组织与账号",
        "en-US": "Organization & Accounts"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false
    },
    {
      "id": "14f79652-5cee-538a-a9cc-fad99f53cf25",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "dir",
      "label": {
        "zh-CN": "权限",
        "en-US": "Permissions"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false
    },
    {
      "id": "72562a41-a2ea-532c-8413-709f5e785f9f",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "dir",
      "label": {
        "zh-CN": "基础数据",
        "en-US": "Reference data"
      },
      "visible": true,
      "sort": 5,
      "origin": "catalog",
      "runtimeManaged": false
    },
    {
      "id": "96470888-9750-553c-8dea-861423c975af",
      "parentId": "72562a41-a2ea-532c-8413-709f5e785f9f",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "数据字典",
        "en-US": "Dictionaries"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "book-open",
      "path": "/admin/dicts",
      "permission": "sys:dict:view"
    },
    {
      "id": "64f12f5c-cf89-566e-af9f-b7b85136eb41",
      "parentId": "e77751c5-5d9b-55c7-a4a1-c9edce4fab39",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "岗位管理",
        "en-US": "Posts"
      },
      "visible": true,
      "sort": 4,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "briefcase",
      "path": "/admin/posts",
      "permission": "iam:post:view"
    },
    {
      "id": "17cfb444-f78b-5c52-9bc7-ae125b4a4653",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "审计",
        "en-US": "Audit"
      },
      "visible": true,
      "sort": 9,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "shield",
      "path": "/admin/audit",
      "permission": "sys:audit:view"
    },
    {
      "id": "c66bfc36-b579-53cd-9efc-741db05d8cde",
      "parentId": null,
      "subsystemKey": "admin",
      "type": "dir",
      "label": {
        "zh-CN": "系统配置",
        "en-US": "System settings"
      },
      "visible": true,
      "sort": 7,
      "origin": "catalog",
      "runtimeManaged": false
    },
    {
      "id": "093019f5-3614-51f6-b71d-d4b81431211f",
      "parentId": "c66bfc36-b579-53cd-9efc-741db05d8cde",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "定时任务",
        "en-US": "Scheduled jobs"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "clock",
      "path": "/admin/jobs",
      "permission": "sys:job:view"
    },
    {
      "id": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "parentId": "c66bfc36-b579-53cd-9efc-741db05d8cde",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "通知公告",
        "en-US": "Announcements"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "bell",
      "path": "/admin/notices",
      "permission": "iam:notice:view"
    },
    {
      "id": "182d9581-657a-5a9e-adb4-973ea82bd01c",
      "parentId": "c66bfc36-b579-53cd-9efc-741db05d8cde",
      "subsystemKey": "admin",
      "type": "menu",
      "label": {
        "zh-CN": "系统设置",
        "en-US": "System settings"
      },
      "visible": true,
      "sort": 0,
      "origin": "catalog",
      "runtimeManaged": false,
      "icon": "settings",
      "path": "/admin/settings",
      "permission": "sys:settings:view"
    },
    {
      "id": "8b0894c3-f807-5f4b-971d-3ab6e47581c7",
      "parentId": "17cfb444-f78b-5c52-9bc7-ae125b4a4653",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "查看操作与登录日志",
        "en-US": "View operation and login logs"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "audit:log:view"
    },
    {
      "id": "e62f7736-50ad-5d31-a125-9d8d6da5f67b",
      "parentId": "17cfb444-f78b-5c52-9bc7-ae125b4a4653",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "强制下线会话",
        "en-US": "Revoke session"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "audit:session:revoke"
    },
    {
      "id": "05375cf0-148c-5f4e-bd9d-81729873e296",
      "parentId": "17cfb444-f78b-5c52-9bc7-ae125b4a4653",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "查看在线用户",
        "en-US": "View online users"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "audit:session:view"
    },
    {
      "id": "aeec18c5-07b7-5112-9440-a22d2f77fe1c",
      "parentId": "8e4234c2-d9a2-5a6f-a08e-fda0e0be2a5b",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新建",
        "en-US": "New"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:dept:create"
    },
    {
      "id": "227b3899-8e44-5bed-982d-34c108b37636",
      "parentId": "8e4234c2-d9a2-5a6f-a08e-fda0e0be2a5b",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除",
        "en-US": "Delete"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:dept:del"
    },
    {
      "id": "fa79d56d-ec40-5ec1-9274-dd1ba7c13d55",
      "parentId": "8e4234c2-d9a2-5a6f-a08e-fda0e0be2a5b",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑",
        "en-US": "Edit"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:dept:update"
    },
    {
      "id": "6557a69c-3a70-5ec4-b2c6-00a968b07021",
      "parentId": "96470888-9750-553c-8dea-861423c975af",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新建字典类型",
        "en-US": "New dictionary type"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:dict:create"
    },
    {
      "id": "14b42b6c-b5fc-51de-b7b5-067ef357e44f",
      "parentId": "96470888-9750-553c-8dea-861423c975af",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除",
        "en-US": "Delete"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:dict:delete"
    },
    {
      "id": "77463592-00f3-54a7-b6aa-3df0ee75c80b",
      "parentId": "96470888-9750-553c-8dea-861423c975af",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑",
        "en-US": "Edit"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:dict:update"
    },
    {
      "id": "b9064c5d-67f3-5899-bf0b-32d4d00ccf52",
      "parentId": "093019f5-3614-51f6-b71d-d4b81431211f",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "立即执行",
        "en-US": "Run now"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:job:run"
    },
    {
      "id": "3fd31647-1b9e-5316-8ff1-cec82ec06445",
      "parentId": "093019f5-3614-51f6-b71d-d4b81431211f",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "保存配置",
        "en-US": "Save configuration"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:job:update"
    },
    {
      "id": "194703db-8333-589d-8000-2e71ef6a0a32",
      "parentId": "fde7c64f-b2cc-5799-9a5f-8c5b5bec4326",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新增菜单",
        "en-US": "New menu"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:menu:create"
    },
    {
      "id": "f60a4755-8744-509b-a018-c1259cd82fb2",
      "parentId": "fde7c64f-b2cc-5799-9a5f-8c5b5bec4326",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除",
        "en-US": "Delete"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:menu:del"
    },
    {
      "id": "ce6d0ccf-bd57-55b2-a350-8f8c078f7eaf",
      "parentId": "fde7c64f-b2cc-5799-9a5f-8c5b5bec4326",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑",
        "en-US": "Edit"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:menu:update"
    },
    {
      "id": "2d07a788-b92f-5813-8843-d6e23edac1a6",
      "parentId": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "发布公告",
        "en-US": "New announcement"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:notice:create"
    },
    {
      "id": "c5717f6d-1c67-561b-9d1b-eedf6ccedc8b",
      "parentId": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除公告",
        "en-US": "Delete announcement"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:notice:delete"
    },
    {
      "id": "e61b2be7-8a51-5e35-bfcc-595593b96f5f",
      "parentId": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "立即发布",
        "en-US": "Publish now"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:notice:publish"
    },
    {
      "id": "96dadf0e-c484-5d59-9afb-1ed91dc31eb0",
      "parentId": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑公告",
        "en-US": "Edit announcement"
      },
      "visible": true,
      "sort": 4,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:notice:update"
    },
    {
      "id": "ba8ba622-6e1d-5629-b676-a6572821eebb",
      "parentId": "dbe932e6-388a-53e0-9a3f-f3d91011ca86",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "撤回公告",
        "en-US": "Withdraw announcement"
      },
      "visible": true,
      "sort": 5,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:notice:withdraw"
    },
    {
      "id": "b86e061e-27a9-56f6-9bf5-12dc7c8e2016",
      "parentId": "64f12f5c-cf89-566e-af9f-b7b85136eb41",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新建岗位",
        "en-US": "New post"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:post:create"
    },
    {
      "id": "a9782f27-2658-52ef-b2ee-7f24f3b71397",
      "parentId": "64f12f5c-cf89-566e-af9f-b7b85136eb41",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除岗位",
        "en-US": "Delete post"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:post:delete"
    },
    {
      "id": "67484da1-58bc-5171-a800-de837ffd17dd",
      "parentId": "64f12f5c-cf89-566e-af9f-b7b85136eb41",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑岗位",
        "en-US": "Edit post"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:post:update"
    },
    {
      "id": "4130812f-e628-5e58-9c87-b72e05df6352",
      "parentId": "03a08c09-8922-530f-ae1d-49b40ca5c84a",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新增角色",
        "en-US": "Add role"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:role:create"
    },
    {
      "id": "ed94d583-4286-51af-867a-32b41d104723",
      "parentId": "03a08c09-8922-530f-ae1d-49b40ca5c84a",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "删除角色",
        "en-US": "Delete role"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:role:del"
    },
    {
      "id": "75244853-0658-5281-8513-67760e1b7b80",
      "parentId": "03a08c09-8922-530f-ae1d-49b40ca5c84a",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "保存功能权限",
        "en-US": "Save functional permissions"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:role:grant"
    },
    {
      "id": "594212ee-1e65-5b8d-860c-6672194df9aa",
      "parentId": "03a08c09-8922-530f-ae1d-49b40ca5c84a",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "保存角色",
        "en-US": "Save role"
      },
      "visible": true,
      "sort": 4,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:role:update"
    },
    {
      "id": "12c7cbba-bbfc-5ae2-8925-130f9305e067",
      "parentId": "182d9581-657a-5a9e-adb4-973ea82bd01c",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "保存更改",
        "en-US": "Save changes"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "sys:settings:update"
    },
    {
      "id": "b478031d-c2a4-555a-88c7-237140cc55ba",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "分配角色",
        "en-US": "Assign roles"
      },
      "visible": true,
      "sort": 1,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:assign_roles"
    },
    {
      "id": "18068c83-c1c8-5064-917d-e6af6fed2f7e",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "新建用户",
        "en-US": "New user"
      },
      "visible": true,
      "sort": 2,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:create"
    },
    {
      "id": "3631c062-9274-51ff-b5cc-6162199e5392",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "注销用户",
        "en-US": "Archive user"
      },
      "visible": true,
      "sort": 3,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:delete"
    },
    {
      "id": "2e44a041-0078-5089-ba4d-fb34566b288a",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "停用",
        "en-US": "Disable"
      },
      "visible": true,
      "sort": 4,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:change_status"
    },
    {
      "id": "a4b13640-cb13-51a4-864f-1e7c16bc5369",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "导入导出",
        "en-US": "Import / export"
      },
      "visible": true,
      "sort": 5,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:export"
    },
    {
      "id": "c16e89aa-1398-5de3-a9c3-f3e2674d747b",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "导入用户",
        "en-US": "Import users"
      },
      "visible": true,
      "sort": 6,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:import"
    },
    {
      "id": "495bf315-3af6-5b46-ac87-ec4ce9647c97",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "调整归属",
        "en-US": "Move organization"
      },
      "visible": true,
      "sort": 7,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:move"
    },
    {
      "id": "09ea69f4-37fc-54e8-88fd-0363203256a6",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "重置密码",
        "en-US": "Reset password"
      },
      "visible": true,
      "sort": 8,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:reset_password"
    },
    {
      "id": "8d10520c-ef22-56c2-b6cb-275555283c8e",
      "parentId": "d00aecde-d6ac-5522-81ea-805ede453d20",
      "subsystemKey": "admin",
      "type": "action",
      "label": {
        "zh-CN": "编辑",
        "en-US": "Edit"
      },
      "visible": true,
      "sort": 9,
      "origin": "catalog",
      "runtimeManaged": false,
      "permission": "iam:user:update"
    }
  ]
};
