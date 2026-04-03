import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  User,
  Workspace,
  Folder,
  Note,
  SearchResult,
  AuthResponse,
  SignupPayload,
  LoginPayload,
  CreateFolderPayload,
  CreateNotePayload,
  UpdateNotePayload,
  SyncPayload,
  SyncResponse,
} from '@/types';
import type { RootState } from './index';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Workspace', 'Folder', 'Note', 'User'],
  endpoints: builder => ({
    // Auth
    signup: builder.mutation<AuthResponse, SignupPayload>({
      query: body => ({ url: '/auth/signup', method: 'POST', body }),
    }),
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: body => ({ url: '/auth/login', method: 'POST', body }),
    }),
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),

    // Workspaces
    getWorkspaces: builder.query<Workspace[], void>({
      query: () => '/workspaces',
      providesTags: ['Workspace'],
    }),
    createWorkspace: builder.mutation<Workspace, { name: string }>({
      query: body => ({ url: '/workspaces', method: 'POST', body }),
      invalidatesTags: ['Workspace'],
    }),
    deleteWorkspace: builder.mutation<void, string>({
      query: id => ({ url: `/workspaces/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Workspace'],
    }),
    addMember: builder.mutation<void, { workspaceId: string; email: string }>({
      query: ({ workspaceId, email }) => ({
        url: `/workspaces/${workspaceId}/members`,
        method: 'POST',
        body: { email },
      }),
      invalidatesTags: ['Workspace'],
    }),
    removeMember: builder.mutation<void, { workspaceId: string; userId: string }>({
      query: ({ workspaceId, userId }) => ({
        url: `/workspaces/${workspaceId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workspace'],
    }),

    // Folders
    getFolders: builder.query<Folder[], string>({
      query: workspaceId => `/workspaces/${workspaceId}/folders`,
      providesTags: ['Folder'],
    }),
    createFolder: builder.mutation<Folder, CreateFolderPayload>({
      query: body => ({ url: '/folders', method: 'POST', body }),
      invalidatesTags: ['Folder'],
    }),
    deleteFolder: builder.mutation<void, string>({
      query: id => ({ url: `/folders/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Folder', 'Note'],
    }),

    // Notes
    getNotes: builder.query<Note[], { workspaceId: string; folderId?: string }>({
      query: ({ workspaceId, folderId }) => {
        const params = new URLSearchParams({ workspaceId });
        if (folderId) params.set('folderId', folderId);
        return `/notes?${params.toString()}`;
      },
      providesTags: ['Note'],
    }),
    getNote: builder.query<Note, string>({
      query: id => `/notes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Note', id }],
    }),
    createNote: builder.mutation<Note, CreateNotePayload>({
      query: body => ({ url: '/notes', method: 'POST', body }),
      invalidatesTags: ['Note'],
    }),
    updateNote: builder.mutation<Note, UpdateNotePayload>({
      query: ({ id, ...body }) => ({ url: `/notes/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Note', id }, 'Note'],
    }),
    deleteNote: builder.mutation<void, string>({
      query: id => ({ url: `/notes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Note'],
    }),

    // Search & Sync
    searchNotes: builder.query<SearchResult[], string>({
      query: q => `/notes/search?q=${encodeURIComponent(q)}`,
    }),
    syncNotes: builder.mutation<SyncResponse, SyncPayload>({
      query: body => ({ url: '/notes/sync', method: 'POST', body }),
      invalidatesTags: ['Note'],
    }),
  }),
});

export const {
  useSignupMutation,
  useLoginMutation,
  useGetMeQuery,
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useGetFoldersQuery,
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useGetNotesQuery,
  useGetNoteQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useSearchNotesQuery,
  useSyncNotesMutation,
} = api;
