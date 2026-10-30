import { CheckCircle2, Clock, CircleDot, AlertCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface TimelineItem {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  actor?: string;
}

interface TimelineViewProps {
  items: TimelineItem[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ items }) => {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCompleted = item.status === 'completed';
        const isInProgress = item.status === 'in_progress';
        const isBlocked = item.status === 'blocked';

        return (
          <View key={item.id} style={styles.row}>
            {/* Left timeline indicator */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.nodeCircle,
                  isCompleted && styles.nodeCompleted,
                  isInProgress && styles.nodeInProgress,
                  isBlocked && styles.nodeBlocked,
                ]}
              >
                {isCompleted ? (
                  <CheckCircle2 size={14} color="#FFFFFF" />
                ) : isInProgress ? (
                  <CircleDot size={14} color="#2563EB" />
                ) : isBlocked ? (
                  <AlertCircle size={14} color="#DC2626" />
                ) : (
                  <Clock size={12} color="#94A3B8" />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.verticalLine,
                    isCompleted && styles.lineCompleted,
                  ]}
                />
              )}
            </View>

            {/* Right content */}
            <View style={[styles.contentCol, !isLast && { paddingBottom: 20 }]}>
              <View style={styles.headerRow}>
                <Text
                  style={[
                    styles.title,
                    isCompleted && styles.titleCompleted,
                    isInProgress && styles.titleInProgress,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>

              {item.actor && (
                <View style={styles.actorBadge}>
                  <Text style={styles.actorText}>{item.actor}</Text>
                </View>
              )}

              <Text style={styles.description}>{item.description}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  nodeInProgress: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  nodeBlocked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: -2,
    marginBottom: -2,
  },
  lineCompleted: {
    backgroundColor: '#86EFAC',
  },
  contentCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  titleCompleted: {
    color: '#10234D',
  },
  titleInProgress: {
    color: '#2563EB',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actorBadge: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  actorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});

export default TimelineView;
