import { useState, useEffect } from 'react';
import {
  Link2, Check, EyeOff, Edit3, Eye, Loader2,
  UserPlus, Trash2, Crown, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  useShareNoteMutation,
  useUnshareNoteMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
} from '@/store/api';
import { useAppSelector, selectUser } from '@/store';
import { cn } from '@/utils/cn';
import type { Note, Workspace } from '@/types';

interface ShareNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note;
  workspace: Workspace;
  isOwner: boolean;
}

export function ShareNoteModal({ isOpen, onClose, note, workspace, isOwner }: ShareNoteModalProps) {
  // ── Link sharing state ────────────────────────────────────────────────────
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [copied, setCopied] = useState(false);

  // ── People state ──────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentUser = useAppSelector(selectUser);

  const [shareNote, { isLoading: isSharing }] = useShareNoteMutation();
  const [unshareNote, { isLoading: isUnsharing }] = useUnshareNoteMutation();
  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [removeMember] = useRemoveMemberMutation();

  // Reset link state when modal opens for a different note
  useEffect(() => {
    if (isOpen) {
      setShareToken(null);
      setCopied(false);
      setPermission('view');
      setEmail('');
    }
  }, [isOpen, note.id]);

  const shareLink = shareToken
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  // ── Link handlers ─────────────────────────────────────────────────────────
  const handleCreateLink = async () => {
    try {
      const result = await shareNote({ id: note.id, permission }).unwrap();
      setShareToken(result.shareToken);
      setPermission(result.sharePermission);
      toast.success('Share link created');
    } catch {
      toast.error('Failed to create share link');
    }
  };

  const handlePermissionChange = async (newPermission: 'view' | 'edit') => {
    if (!shareToken) { setPermission(newPermission); return; }
    try {
      const result = await shareNote({ id: note.id, permission: newPermission }).unwrap();
      setShareToken(result.shareToken);
      setPermission(result.sharePermission);
    } catch {
      toast.error('Failed to update permission');
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleRevoke = async () => {
    try {
      await unshareNote(note.id).unwrap();
      setShareToken(null);
      toast.success('Share link revoked');
    } catch {
      toast.error('Failed to revoke link');
    }
  };

  // ── People handlers ───────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!email.trim()) return;
    try {
      await addMember({ workspaceId: workspace.id, email: email.trim() }).unwrap();
      setEmail('');
      toast.success(`Invited ${email.trim()}`);
    } catch (err: unknown) {
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (code === 'USER_NOT_FOUND') toast.error('No account found with that email');
      else if (code === 'ALREADY_MEMBER') toast.error('Already a member');
      else toast.error('Failed to add member');
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeMember({ workspaceId: workspace.id, userId }).unwrap();
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share" size="md">
      <div className="space-y-5">

        {/* ── Section: Link sharing ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Anyone with the link</p>
          </div>

          {/* Permission toggle */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => handlePermissionChange('view')}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                permission === 'view'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <Eye className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <p className="font-semibold leading-tight">View only</p>
                <p className="text-xs font-normal opacity-70">Read but not edit</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handlePermissionChange('edit')}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                permission === 'edit'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <Edit3 className="h-4 w-4 shrink-0" />
              <div className="text-left">
                <p className="font-semibold leading-tight">Can edit</p>
                <p className="text-xs font-normal opacity-70">Full editing access</p>
              </div>
            </button>
          </div>

          {/* Link row */}
          {shareLink ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Link2 className="h-4 w-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 font-mono">
                  {shareLink}
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all',
                    copied
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  )}
                >
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Link2 className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={isUnsharing}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                >
                  {isUnsharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
                  Revoke link
                </button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleCreateLink}
              isLoading={isSharing}
              leftIcon={<Link2 className="h-4 w-4" />}
            >
              Create share link
            </Button>
          )}
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* ── Section: People with access ───────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            People with access
            <span className="ml-1.5 text-xs font-normal text-gray-400">({workspace.members.length})</span>
          </p>

          {/* Add by email — owner only */}
          {isOwner && (
            <div className="flex gap-2 mb-3">
              <Input
                type="email"
                placeholder="Add by email…"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                aria-label="Email address to invite"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                isLoading={isAdding}
                disabled={!email.trim()}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Invite
              </Button>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {workspace.members.map(member => {
              const memberIsOwner = member.role === 'owner';
              const isSelf = member.userId === currentUser?.id;
              return (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Avatar user={member.user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {member.user.name}
                      {isSelf && <span className="ml-1 text-xs text-gray-400 font-normal">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.user.email}</p>
                  </div>
                  {memberIsOwner ? (
                    <Badge variant="owner"><Crown className="h-3 w-3 mr-1" />Owner</Badge>
                  ) : (
                    <Badge variant="member">Member</Badge>
                  )}
                  {isOwner && !memberIsOwner && !isSelf && (
                    <button
                      onClick={() => handleRemove(member.userId)}
                      aria-label={`Remove ${member.user.name}`}
                      disabled={removingId === member.userId}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
          The share link gives access to this note only — not your workspace.
        </p>
      </div>
    </Modal>
  );
}
