import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { useDebounced, useFetch } from '../lib/useFetch';
import {
  CHART_COLORS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_LABEL,
  PAYMENT_METHODS,
} from '../lib/constants';
import {
  formatCurrency,
  formatDate,
  formatMonth,
  fromDateInput,
  monthInput,
  monthRange,
  shiftMonth,
  toDateInput,
  todayInput,
} from '../lib/format';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormAlert,
  IconButton,
  LoadingCard,
  Modal,
  PageHeader,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
} from '../components/ui';
import { BarChart, ChartLegend, DonutChart } from '../components/charts';
import { Icon } from '../components/Icons';

function MoneyStat({ tone, icon, label, value, detail }) {
  return (
    <div className="stat-card">
      <div className="stat-card__top">
        <span className={`icon-tile icon-tile--${tone}`} aria-hidden="true">
          <Icon name={icon} size={18} />
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      <p className="stat-card__value">{value}</p>
      {detail ? <p className="stat-card__detail">{detail}</p> : null}
    </div>
  );
}

function TransactionModal({ open, onClose, transaction, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    type: 'expense',
    amount: '',
    category: '',
    date: todayInput(),
    paymentMethod: 'card',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      type: transaction?.type || 'expense',
      amount: transaction ? String(transaction.amount) : '',
      category: transaction?.category || '',
      date: toDateInput(transaction?.date || new Date()),
      paymentMethod: transaction?.paymentMethod || 'card',
      notes: transaction?.notes || '',
    });
    setErrors({});
    setServerError('');
  }, [open, transaction]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const changeType = (type) => {
    setForm((current) => ({
      ...current,
      type,
      category: '',
    }));
  };

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter an amount greater than zero.';
    if (!form.category.trim()) next.category = 'Choose or type a category.';
    if (!form.date) next.date = 'Choose a date.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError('');
    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        category: form.category.trim(),
        date: fromDateInput(form.date) || new Date().toISOString(),
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      };
      if (transaction?._id) {
        await api(`/transactions/${transaction._id}`, { method: 'PUT', body: payload });
        toast.success('Transaction updated.');
      } else {
        await api('/transactions', { method: 'POST', body: payload });
        toast.success('Transaction added.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={transaction ? 'Edit transaction' : 'Add a transaction'}
      description="Small, consistent records make the monthly picture clearer."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="transaction-form" loading={saving}>
            {transaction ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form id="transaction-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <div className="field">
          <span className="field__label">Type</span>
          <SegmentedControl
            label="Transaction type"
            value={form.type}
            onChange={changeType}
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
          />
        </div>

        <div className="form-grid">
          <TextField
            label="Amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            placeholder="0"
            value={form.amount}
            onChange={update('amount')}
            error={errors.amount}
            required
          />
          <TextField
            label="Date"
            type="date"
            value={form.date}
            onChange={update('date')}
            error={errors.date}
            required
          />
        </div>

        <TextField
          label="Category"
          placeholder={form.type === 'income' ? 'e.g. Salary' : 'e.g. Groceries'}
          list="transaction-categories"
          value={form.category}
          onChange={update('category')}
          error={errors.category}
          maxLength={60}
          required
        />
        <datalist id="transaction-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <SelectField
          label="Payment method"
          options={PAYMENT_METHODS}
          value={form.paymentMethod}
          onChange={update('paymentMethod')}
        />

        <TextareaField
          label="Notes"
          placeholder="Optional — what was this for?"
          rows={2}
          value={form.notes}
          onChange={update('notes')}
          maxLength={500}
          error={errors.notes}
        />
      </form>
    </Modal>
  );
}

function BudgetModal({ open, onClose, budget, defaultMonth, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ category: '', amount: '', month: defaultMonth });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      category: budget?.category || '',
      amount: budget ? String(budget.amount) : '',
      month: budget?.month || defaultMonth,
    });
    setErrors({});
    setServerError('');
  }, [open, budget, defaultMonth]);

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.category.trim()) next.category = 'Choose or type a category.';
    if (!form.amount || Number(form.amount) <= 0) next.amount = 'Enter an amount greater than zero.';
    if (!form.month) next.month = 'Choose a month.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError('');
    try {
      const payload = {
        category: form.category.trim(),
        amount: Number(form.amount),
        month: form.month,
      };
      if (budget?._id) {
        await api(`/budgets/${budget._id}`, { method: 'PUT', body: payload });
        toast.success('Budget updated.');
      } else {
        await api('/budgets', { method: 'POST', body: payload });
        toast.success('Budget created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setServerError(err.message);
      if (err.errors) setErrors(err.errors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={budget ? 'Edit budget' : 'Create a budget'}
      description="Set a gentle monthly limit for one spending category."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="budget-form" loading={saving}>
            {budget ? 'Save budget' : 'Create budget'}
          </Button>
        </>
      }
    >
      <form id="budget-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <FormAlert>{serverError}</FormAlert>

        <TextField
          label="Category"
          placeholder="e.g. Groceries"
          list="budget-categories"
          value={form.category}
          onChange={update('category')}
          error={errors.category}
          maxLength={60}
          required
        />
        <datalist id="budget-categories">
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>

        <div className="form-grid">
          <TextField
            label="Monthly limit"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            placeholder="0"
            value={form.amount}
            onChange={update('amount')}
            error={errors.amount}
            required
          />
          <TextField
            label="Month"
            type="month"
            value={form.month}
            onChange={update('month')}
            error={errors.month}
            required
          />
        </div>
      </form>
    </Modal>
  );
}

export default function Money() {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.preferences?.currency || 'INR';
  const fmt = (value, options) => formatCurrency(value, currency, options);

  const currentMonth = monthInput();
  const initialRange = monthRange(currentMonth);
  const [month, setMonth] = useState(currentMonth);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    from: initialRange.from,
    to: initialRange.to,
  });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [txModal, setTxModal] = useState({ open: false, transaction: null });
  const [budgetModal, setBudgetModal] = useState({ open: false, budget: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const summaryPath = `/transactions/summary?month=${month}`;
  const { data: summary, loading: summaryLoading, error: summaryError, reload: reloadSummary } =
    useFetch(summaryPath);

  const txPath = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.category) params.set('category', filters.category);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    params.set('page', String(page));
    params.set('limit', '10');
    return `/transactions?${params.toString()}`;
  }, [filters, debouncedSearch, page]);

  const {
    data: txData,
    loading: txLoading,
    error: txError,
    reload: reloadTransactions,
  } = useFetch(txPath);

  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.category, filters.from, filters.to, debouncedSearch, month]);

  const categoryOptions = useMemo(() => {
    const categories = new Set([
      ...EXPENSE_CATEGORIES,
      ...INCOME_CATEGORIES,
      ...(summary?.byCategory || []).map((item) => item.category),
      ...(txData?.items || []).map((item) => item.category),
    ]);
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [summary, txData]);

  const refreshAll = () => {
    reloadSummary();
    reloadTransactions();
  };

  const updateFilter = (key) => (event) => {
    setFilters((current) => ({ ...current, [key]: event.target.value }));
  };

  const clearFilters = () => {
    const range = monthRange(month);
    setFilters({ type: '', category: '', from: range.from, to: range.to });
    setSearch('');
    setPage(1);
  };

  const changeMonth = (delta) => {
    const next = shiftMonth(month, delta);
    const range = monthRange(next);
    setMonth(next);
    setFilters((current) => ({ ...current, from: range.from, to: range.to }));
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.kind === 'transaction'
          ? `/transactions/${deleteTarget.item._id}`
          : `/budgets/${deleteTarget.item.id || deleteTarget.item._id}`;
      await api(endpoint, { method: 'DELETE' });
      toast.success(deleteTarget.kind === 'transaction' ? 'Transaction deleted.' : 'Budget deleted.');
      setDeleteTarget(null);
      refreshAll();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const spendingData = useMemo(() => {
    if (!summary) return [];
    const top = summary.byCategory.slice(0, 6);
    const rest = summary.byCategory.slice(6).reduce((sum, item) => sum + item.total, 0);
    const rows = top.map((item, index) => ({
      label: item.category,
      value: item.total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      formatted: fmt(item.total),
    }));
    if (rest > 0) {
      rows.push({
        label: 'Other',
        value: rest,
        color: CHART_COLORS[6],
        formatted: fmt(rest),
      });
    }
    return rows;
  }, [summary, currency]);

  const trendData = (summary?.trend || []).map((item) => ({
    label: item.label,
    values: [item.income, item.expenses],
    title: item.label,
  }));

  const hasFilters =
    Boolean(filters.type || filters.category || search.trim()) ||
    filters.from !== monthRange(month).from ||
    filters.to !== monthRange(month).to;

  const alertText = summary?.alerts?.length
    ? summary.alerts
        .map((alert) =>
          alert.status === 'over'
            ? `${alert.category} is ${alert.percent - 100}% over budget`
            : `${alert.category} is at ${alert.percent}% of budget`
        )
        .join(' · ')
    : '';

  return (
    <div className="money-page">
      <PageHeader
        eyebrow="Money"
        title="A clearer money picture"
        description="Track what comes in, what goes out, and what you’re keeping."
        actions={
          <>
            <div className="month-nav" aria-label="Select month">
              <IconButton label="Previous month" icon="chevronLeft" onClick={() => changeMonth(-1)} />
              <span className="month-nav__label">{formatMonth(month)}</span>
              <IconButton label="Next month" icon="chevronRight" onClick={() => changeMonth(1)} />
            </div>
            <Button
              icon="plus"
              onClick={() => setTxModal({ open: true, transaction: null })}
            >
              Add transaction
            </Button>
          </>
        }
      />

      {summaryLoading && !summary ? (
        <div className="money-stats" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="card" key={index}>
              <LoadingCard rows={2} />
            </div>
          ))}
        </div>
      ) : summaryError ? (
        <ErrorState error={summaryError} onRetry={reloadSummary} />
      ) : summary ? (
        <>
          <div className="money-stats">
            <MoneyStat
              tone="sage"
              icon="trendUp"
              label="Income"
              value={fmt(summary.income)}
              detail={`${formatMonth(summary.month)}`}
            />
            <MoneyStat
              tone="clay"
              icon="trendDown"
              label="Expenses"
              value={fmt(summary.expenses)}
              detail={`${summary.byCategory.length} spending categor${summary.byCategory.length === 1 ? 'y' : 'ies'}`}
            />
            <MoneyStat
              tone="sky"
              icon="wallet"
              label="Saved"
              value={fmt(summary.savings)}
              detail={`${summary.savingsRate}% of income kept`}
            />
            <MoneyStat
              tone="gold"
              icon="target"
              label="Budget left"
              value={summary.totalBudget ? fmt(summary.remainingBudget) : 'No budgets'}
              detail={
                summary.totalBudget
                  ? `${fmt(summary.budgetSpent)} of ${fmt(summary.totalBudget)} used`
                  : 'Add a budget to track limits'
              }
            />
          </div>

          {summary.alerts.length ? (
            <div className="budget-alert" role="status">
              <span className="budget-alert__icon" aria-hidden="true">
                <Icon name="alert" size={19} />
              </span>
              <div>
                <strong>
                  {summary.alerts.length} budget warning{summary.alerts.length === 1 ? '' : 's'}
                </strong>
                <p>{alertText}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBudgetModal({ open: true, budget: null })}
              >
                Adjust budgets
              </Button>
            </div>
          ) : null}

          <div className="chart-duo">
            <section className="card" aria-labelledby="money-spending-title">
              <SectionHeader
                title="Spending by category"
                description={formatMonth(month)}
                action={<Badge tone="clay">{fmt(summary.expenses)}</Badge>}
              />
              <h2 id="money-spending-title" className="sr-only">
                Spending by category
              </h2>
              {spendingData.length ? (
                <div className="donut-layout">
                  <DonutChart
                    data={spendingData}
                    centerValue={fmt(summary.expenses, { compact: true })}
                    centerLabel="spent"
                    ariaLabel={`Spending by category: ${spendingData
                      .map((item) => `${item.label} ${item.formatted}`)
                      .join(', ')}`}
                  />
                  <ChartLegend items={spendingData} />
                </div>
              ) : (
                <EmptyState
                  icon="wallet"
                  title="No spending recorded"
                  description="Add an expense for this month to see the breakdown."
                />
              )}
            </section>

            <section className="card" aria-labelledby="money-trend-title">
              <SectionHeader
                title="Six-month rhythm"
                description="Income compared with spending"
                action={
                  <div className="chart-legend chart-legend--inline">
                    <span className="chart-legend__swatch" style={{ background: 'var(--sage)' }} />
                    <span>Income</span>
                    <span className="chart-legend__swatch" style={{ background: 'var(--clay)' }} />
                    <span>Spend</span>
                  </div>
                }
              />
              <h2 id="money-trend-title" className="sr-only">
                Income and expenses over six months
              </h2>
              <BarChart
                data={trendData}
                height={186}
                colors={['var(--sage)', 'var(--clay)']}
                formatValue={(value) => fmt(value)}
                ariaLabel={`Income and expenses by month: ${(summary.trend || [])
                  .map((item) => `${item.label} income ${fmt(item.income)} expenses ${fmt(item.expenses)}`)
                  .join(', ')}`}
              />
            </section>
          </div>

          <div className="money-layout">
            <section className="card" aria-labelledby="transactions-title">
              <SectionHeader
                title="Transactions"
                description={`${txData?.total ?? 0} recorded`}
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    onClick={() => setTxModal({ open: true, transaction: null })}
                  >
                    Add
                  </Button>
                }
              />
              <h2 id="transactions-title" className="sr-only">
                Transaction list
              </h2>

              <div className="filters-grid">
                <TextField
                  label="Search"
                  type="search"
                  placeholder="Search notes or category…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="filters-grid__search"
                />
                <SelectField
                  label="Type"
                  value={filters.type}
                  onChange={updateFilter('type')}
                  options={[
                    { value: '', label: 'All types' },
                    { value: 'expense', label: 'Expenses' },
                    { value: 'income', label: 'Income' },
                  ]}
                />
                <SelectField
                  label="Category"
                  value={filters.category}
                  onChange={updateFilter('category')}
                  options={[
                    { value: '', label: 'All categories' },
                    ...categoryOptions.map((category) => ({ value: category, label: category })),
                  ]}
                />
                <TextField
                  label="From"
                  type="date"
                  value={filters.from}
                  onChange={updateFilter('from')}
                />
                <TextField
                  label="To"
                  type="date"
                  value={filters.to}
                  onChange={updateFilter('to')}
                />
                <div className="filters-grid__actions">
                  <Button variant="ghost" size="sm" onClick={clearFilters} disabled={!hasFilters}>
                    Clear filters
                  </Button>
                </div>
              </div>

              {txLoading ? (
                <LoadingCard rows={7} />
              ) : txError ? (
                <ErrorState error={txError} onRetry={reloadTransactions} />
              ) : txData?.items?.length ? (
                <>
                  <ul className="tx-list">
                    {txData.items.map((transaction) => (
                      <li key={transaction._id} className="tx-row">
                        <span
                          className={`tx-icon tx-icon--${transaction.type}`}
                          aria-hidden="true"
                        >
                          <Icon
                            name={transaction.type === 'income' ? 'trendUp' : 'trendDown'}
                            size={17}
                          />
                        </span>
                        <div className="tx-main">
                          <p>{transaction.category}</p>
                          <span>{transaction.notes || 'No notes'}</span>
                        </div>
                        <div className="tx-meta">
                          <span>{formatDate(transaction.date, { short: true })}</span>
                          <Badge tone="neutral">{PAYMENT_LABEL[transaction.paymentMethod]}</Badge>
                        </div>
                        <span className={`tx-amount tx-amount--${transaction.type}`}>
                          {transaction.type === 'income' ? '+' : '−'}
                          {fmt(transaction.amount)}
                        </span>
                        <div className="tx-actions">
                          <IconButton
                            label={`Edit ${transaction.category} transaction`}
                            icon="pencil"
                            size="sm"
                            onClick={() => setTxModal({ open: true, transaction })}
                          />
                          <IconButton
                            label={`Delete ${transaction.category} transaction`}
                            icon="trash"
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setDeleteTarget({ kind: 'transaction', item: transaction })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>

                  {txData.pages > 1 ? (
                    <div className="pagination">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="chevronLeft"
                        disabled={page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                      >
                        Previous
                      </Button>
                      <span className="pagination__status">
                        Page {txData.page} of {txData.pages}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        iconRight="chevronRight"
                        disabled={page >= txData.pages}
                        onClick={() => setPage((value) => Math.min(txData.pages, value + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  icon="inbox"
                  title={hasFilters ? 'No matching transactions' : 'No transactions this month'}
                  description={
                    hasFilters
                      ? 'Try widening the date range or clearing a filter.'
                      : 'Add your first income or expense to bring this month into focus.'
                  }
                  action={
                    hasFilters ? (
                      <Button variant="secondary" size="sm" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        icon="plus"
                        onClick={() => setTxModal({ open: true, transaction: null })}
                      >
                        Add transaction
                      </Button>
                    )
                  }
                />
              )}
            </section>

            <aside className="money-side" aria-label="Budget details">
              <section className="card" aria-labelledby="budgets-title">
                <SectionHeader
                  title="Monthly budgets"
                  description={formatMonth(month)}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="plus"
                      onClick={() => setBudgetModal({ open: true, budget: null })}
                    >
                      Add
                    </Button>
                  }
                />
                <h2 id="budgets-title" className="sr-only">
                  Monthly budgets
                </h2>

                {summary.budgets.length ? (
                  <>
                    <div className="budget-total">
                      <div>
                        <span>Planned</span>
                        <strong>{fmt(summary.totalBudget)}</strong>
                      </div>
                      <div>
                        <span>Spent</span>
                        <strong>{fmt(summary.budgetSpent)}</strong>
                      </div>
                      <div>
                        <span>Left</span>
                        <strong className={summary.remainingBudget < 0 ? 'text-danger' : ''}>
                          {fmt(summary.remainingBudget)}
                        </strong>
                      </div>
                    </div>

                    <ul className="budget-list">
                      {summary.budgets.map((budget) => (
                        <li key={budget.id} className="budget-item">
                          <div className="budget-item__top">
                            <div>
                              <strong>{budget.category}</strong>
                              <span>
                                {fmt(budget.spent)} of {fmt(budget.amount)}
                              </span>
                            </div>
                            <Badge
                              tone={
                                budget.status === 'over'
                                  ? 'danger'
                                  : budget.status === 'near'
                                    ? 'gold'
                                    : 'sage'
                              }
                            >
                              {budget.status === 'over'
                                ? 'Over'
                                : budget.status === 'near'
                                  ? 'Near limit'
                                  : 'On track'}
                            </Badge>
                          </div>
                          <ProgressBar
                            value={budget.percent}
                            tone={
                              budget.status === 'over'
                                ? 'danger'
                                : budget.status === 'near'
                                  ? 'gold'
                                  : 'sage'
                            }
                            label={`${budget.category} budget used`}
                          />
                          <div className="budget-item__bottom">
                            <span>
                              {budget.remaining >= 0
                                ? `${fmt(budget.remaining)} left`
                                : `${fmt(Math.abs(budget.remaining))} over`}
                            </span>
                            <div className="row-actions">
                              <IconButton
                                label={`Edit ${budget.category} budget`}
                                icon="pencil"
                                size="sm"
                                onClick={() => setBudgetModal({ open: true, budget })}
                              />
                              <IconButton
                                label={`Delete ${budget.category} budget`}
                                icon="trash"
                                size="sm"
                                variant="danger"
                                onClick={() => setDeleteTarget({ kind: 'budget', item: budget })}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState
                    icon="target"
                    title="No budgets for this month"
                    description="Set limits for the categories you want to keep an eye on."
                    action={
                      <Button
                        size="sm"
                        icon="plus"
                        onClick={() => setBudgetModal({ open: true, budget: null })}
                      >
                        Create a budget
                      </Button>
                    }
                  />
                )}
              </section>

              <div className="inset-note inset-note--sage">
                <span className="inset-note__icon" aria-hidden="true">
                  <Icon name="info" size={18} />
                </span>
                <div>
                  <p className="inset-note__title">A gentle warning</p>
                  <p className="inset-note__body">
                    You’ll see a nudge at 80% of a budget, and a clear warning when it goes over.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </>
      ) : null}

      <TransactionModal
        open={txModal.open}
        transaction={txModal.transaction}
        onClose={() => setTxModal({ open: false, transaction: null })}
        onSaved={refreshAll}
      />

      <BudgetModal
        open={budgetModal.open}
        budget={budgetModal.budget}
        defaultMonth={month}
        onClose={() => setBudgetModal({ open: false, budget: null })}
        onSaved={refreshAll}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === 'transaction'
            ? 'Delete this transaction?'
            : 'Delete this budget?'
        }
        description={
          deleteTarget?.kind === 'transaction'
            ? `${deleteTarget.item.category} · ${fmt(deleteTarget.item.amount)} on ${formatDate(
                deleteTarget.item.date,
                { short: true }
              )}`
            : `${deleteTarget?.item?.category} · ${fmt(deleteTarget?.item?.amount || 0)} per month`
        }
        confirmLabel="Delete"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
