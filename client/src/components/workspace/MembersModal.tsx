import { useState } from 'react';
import { UserPlus, Trash2, Crown, Link, Check, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useAddMemberMutation, useRemoveMemberMutation } from '@/store/api';
import { useAppSelector, selectUser } from '@/store';
import type { Workspace } from '@/types';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace;
  isOwner?: boolean;
}

export function MembersModal({ isOpen, onClose, workspace, isOwner = false }: MembersModalProps) {
  const [email, setEmail] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const currentUser = useAppSelector(selectUser);

  const [addMember, { isLoading: isAdding }] = useAddMemberMutation();
  const [removeMember] = useRemoveMemberMutation();

  const shareLink = `${window.location.origin}/workspace/${workspace.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

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
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${workspace.name}"`} size="md">
      <div className="space-y-5">

        {/* Copy link row */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <div className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
              <Globe className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Anyone with the link</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{shareLink}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shrink-0"
            >
              {linkCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Link className="h-3.5 w-3.5" />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Add by email — owner only */}
        {isOwner && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add people by email
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address…"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                className="flex-1"
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
          </div>
        )}

        {/* Members list */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            People with access{' '}
            <span className="text-gray-400 font-normal">({workspace.members.length})</span>
          </p>
          <div className="space-y-1 max-h-56 overflow-y-auto">
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
                      {isSelf && (
                        <span className="ml-1 text-xs text-gray-400 font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {member.user.email}
                    </p>
                  </div>
                  {memberIsOwner ? (
                    <Badge variant="owner">
                      <Crown className="h-3 w-3 mr-1" />
                      Owner
                    </Badge>
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

      </div>
    </Modal>
  );
}
