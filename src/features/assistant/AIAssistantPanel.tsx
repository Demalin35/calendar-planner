import clsx from 'clsx';
import { addDays, format, subDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EmojiTitle } from '../../components/EmojiTitle';
import { PastelChip } from '../../components/PastelChip';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { ChatMessage, SuggestedItem } from './assistantTypes';
import { requestAssistantPlan } from './assistantApi';
import { t } from './assistantCopy';
import type { AssistantLanguage } from './detectLanguage';
import { getAssistantLanguage } from './detectLanguage';
import { buildPlanningContext } from './mockAssistant';
import { saveApprovedSuggestions } from './saveSuggestions';
import { formatDateKey } from '../calendar/utils';

function createWelcomeMessage(dateLabel: string, lang: AssistantLanguage): ChatMessage {
  return {
    id: uuidv4(),
    role: 'assistant',
    content: t(lang, 'welcome', { date: dateLabel }),
  };
}

export function AIAssistantPanel() {
  const closeAssistant = useUIStore((s) => s.closeAssistant);
  const selectedDate = useUIStore((s) => s.selectedDate);
  const dateKey = formatDateKey(selectedDate);
  const dateLabel = format(selectedDate, 'EEEE, MMMM d, yyyy');
  const rangeStart = formatDateKey(subDays(selectedDate, 7));
  const rangeEnd = formatDateKey(addDays(selectedDate, 14));

  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(dateLabel, 'en'),
  ]);
  const [input, setInput] = useState('');
  const [responseLanguage, setResponseLanguage] = useState<AssistantLanguage>('en');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePlanMessageId, setActivePlanMessageId] = useState<string | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const existingEvents = useLiveQuery(
    () =>
      db.events
        .where('date')
        .between(rangeStart, rangeEnd, true, true)
        .toArray(),
    [rangeStart, rangeEnd],
    [],
  );

  const existingTasks = useLiveQuery(
    () =>
      db.tasks
        .where('date')
        .between(rangeStart, rangeEnd, true, true)
        .toArray(),
    [rangeStart, rangeEnd],
    [],
  );

  const selectedDayEvents = useMemo(
    () => (existingEvents ?? []).filter((event) => event.date === dateKey),
    [existingEvents, dateKey],
  );

  const selectedDayTasks = useMemo(
    () => (existingTasks ?? []).filter((task) => task.date === dateKey),
    [existingTasks, dateKey],
  );

  const activePlan = useMemo(() => {
    if (!activePlanMessageId) return null;
    const message = messages.find((entry) => entry.id === activePlanMessageId);
    return message?.plan ?? null;
  }, [activePlanMessageId, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, activePlan]);

  useEffect(() => {
    setMessages([createWelcomeMessage(dateLabel, responseLanguage)]);
    setInput('');
    setSelectedIds(new Set());
    setActivePlanMessageId(null);
  }, [dateKey, dateLabel]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const lang = getAssistantLanguage(trimmed);
    setResponseLanguage(lang);

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);
    setActivePlanMessageId(null);
    setSelectedIds(new Set());

    try {
      const plan = await requestAssistantPlan({
        message: trimmed,
        selectedDate: dateKey,
        language: lang,
        events: existingEvents ?? [],
        tasks: existingTasks ?? [],
      });

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: plan.summary,
        plan,
      };

      setMessages((current) => [...current, assistantMessage]);

      if (plan.suggestions.length > 0) {
        setActivePlanMessageId(assistantMessage.id);
        setSelectedIds(
          new Set(
            plan.suggestions
              .filter((item) => !item.hasConflict || item.action === 'delete')
              .map((item) => item.id),
          ),
        );
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: uuidv4(),
          role: 'assistant',
          content: t(lang, 'apiError', {
            message:
              error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuggestion = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearActivePlan = () => {
    setActivePlanMessageId(null);
    setSelectedIds(new Set());
    setMessages((current) => [
      ...current,
      {
        id: uuidv4(),
        role: 'assistant',
        content: t(responseLanguage, 'reject'),
      },
    ]);
  };

  const handleSave = async (items: SuggestedItem[]) => {
    if (items.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const result = await saveApprovedSuggestions(items, existingEvents ?? []);
      const content = [
        t(responseLanguage, 'applied', {
          created: result.savedEvents + result.savedTasks,
          updated: result.updatedEvents,
          deleted: result.deletedEvents,
        }),
        result.skipped > 0
          ? t(responseLanguage, 'savedSkipped', { count: result.skipped })
          : '',
      ]
        .filter(Boolean)
        .join('');

      setMessages((current) => [
        ...current,
        {
          id: uuidv4(),
          role: 'assistant',
          content,
        },
      ]);
      setActivePlanMessageId(null);
      setSelectedIds(new Set());
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAll = async () => {
    if (!activePlan) return;
    const items = activePlan.suggestions.filter(
      (item) => !item.hasConflict || item.action === 'delete',
    );
    await handleSave(items);
  };

  const handleAddSelected = async () => {
    if (!activePlan) return;
    const items = activePlan.suggestions.filter(
      (item) =>
        selectedIds.has(item.id) &&
        (!item.hasConflict || item.action === 'delete'),
    );
    await handleSave(items);
  };

  const planningContext = buildPlanningContext(
    dateKey,
    selectedDayEvents,
    selectedDayTasks,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close assistant"
        onClick={closeAssistant}
      />

      <div
        className={clsx(
          'relative z-10 flex min-w-0 flex-col bg-surface shadow-2xl ring-1 ring-border',
          'h-[calc(100dvh-16px)] w-full max-w-[calc(100vw-16px)]',
          'm-2 rounded-2xl sm:m-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none',
        )}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="shrink-0 text-primary-strong" />
              <h2 className="text-lg font-semibold text-foreground">
                Planning Assistant
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Planning for {planningContext.dateLabel}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {planningContext.existingEventCount} events ·{' '}
              {planningContext.existingTaskCount} tasks today
            </p>
          </div>
          <button
            type="button"
            onClick={closeAssistant}
            className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-soft hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={clsx(
                    'max-w-[92%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-surface-soft text-foreground ring-1 ring-border',
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.plan && (
                    <div className="mt-3 space-y-3">
                      {message.plan.notes.map((note) => (
                        <p key={note} className="text-xs text-muted">
                          {note}
                        </p>
                      ))}

                      {message.plan.suggestions.length > 0 && (
                        <div className="space-y-2">
                          {message.plan.suggestions.map((item) => (
                            <SuggestionPreviewCard
                              key={item.id}
                              item={item}
                              lang={responseLanguage}
                              isSelected={selectedIds.has(item.id)}
                              isActivePlan={message.id === activePlanMessageId}
                              onToggle={() => toggleSuggestion(item.id)}
                            />
                          ))}
                        </div>
                      )}

                      <p className="text-xs font-medium text-foreground">
                        {message.plan.approvalPrompt}
                      </p>

                      {message.id === activePlanMessageId &&
                        message.plan.suggestions.length > 0 && (
                          <div className="flex min-w-0 flex-col gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={handleApproveAll}
                              className={clsx('w-full', themeClasses.primaryBtn)}
                            >
                              {t(responseLanguage, 'approveAll')}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || selectedIds.size === 0}
                              onClick={handleAddSelected}
                              className={clsx(
                                'w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-soft disabled:opacity-60',
                              )}
                            >
                              {t(responseLanguage, 'addSelected')}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={clearActivePlan}
                              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft"
                            >
                              {t(responseLanguage, 'rejectButton')}
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-surface-soft px-3 py-2 text-sm text-muted ring-1 ring-border">
                  <Loader2 size={16} className="animate-spin" />
                  {t(responseLanguage, 'loading')}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border p-4">
          <form
            className="flex min-w-0 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="I need to study, shop, and prep for a meeting..."
              className={clsx('min-w-0 flex-1', themeClasses.input)}
              disabled={isLoading || isSaving}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isSaving}
              className={clsx('shrink-0', themeClasses.primaryBtnSm)}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SuggestionPreviewCard({
  item,
  lang,
  isSelected,
  isActivePlan,
  onToggle,
}: {
  item: SuggestedItem;
  lang: AssistantLanguage;
  isSelected: boolean;
  isActivePlan: boolean;
  onToggle: () => void;
}) {
  const action = item.action ?? 'create';
  const actionLabel =
    action === 'delete'
      ? t(lang, 'actionDelete')
      : action === 'update'
        ? t(lang, 'actionUpdate')
        : t(lang, 'actionCreate');
  const canSelect = !item.hasConflict || action === 'delete';

  return (
    <PastelChip
      color={item.color}
      type="button"
      onClick={isActivePlan && canSelect ? onToggle : undefined}
      className={clsx(
        'w-full rounded-xl px-3 py-2 text-left',
        isActivePlan && canSelect && 'cursor-pointer',
        isSelected && 'ring-2 ring-primary-strong',
        item.hasConflict && action !== 'delete' && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-2">
        {isActivePlan && (
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!canSelect}
            onChange={onToggle}
            onClick={(event) => event.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary-soft"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <EmojiTitle
              title={item.title}
              emoji={item.emoji}
              titleClassName="truncate text-sm font-semibold"
            />
            <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {actionLabel} · {t(lang, item.type === 'event' ? 'typeEvent' : 'typeTask')}
            </span>
          </div>
          <p className="mt-1 text-xs" style={{ opacity: 0.85 }}>
            {item.date} · {item.startTime} – {item.endTime}
          </p>
          {item.notes && (
            <p className="mt-1 truncate text-xs" style={{ opacity: 0.75 }}>
              {item.notes}
            </p>
          )}
          {item.hasConflict && action !== 'delete' && (
            <p className="mt-1 text-xs font-medium text-rose-600">
              {item.conflictReason}
            </p>
          )}
        </div>
      </div>
    </PastelChip>
  );
}
