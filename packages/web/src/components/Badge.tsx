import type {
  EdgeStatus,
  NodeStatus,
  Priority,
  ReviewSeverity,
  NodeType,
  RelationType,
} from '../api/types';

type BadgeKind =
  | { kind: 'node-status'; value: NodeStatus }
  | { kind: 'edge-status'; value: EdgeStatus }
  | { kind: 'priority'; value: Priority }
  | { kind: 'severity'; value: ReviewSeverity }
  | { kind: 'node-type'; value: NodeType }
  | { kind: 'relation'; value: RelationType };

const Badge = (props: BadgeKind) => {
  const cls = `badge badge-${props.kind} badge-${props.kind}-${props.value}`;
  return <span className={cls}>{props.value}</span>;
};

export default Badge;
