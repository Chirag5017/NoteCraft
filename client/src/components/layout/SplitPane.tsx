interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
}

export function SplitPane({ left, right, leftWidth = '280px' }: SplitPaneProps) {
  return (
    <div className="flex h-full overflow-hidden">
      <div
        className="shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      <div className="flex-1 overflow-auto">
        {right}
      </div>
    </div>
  );
}
