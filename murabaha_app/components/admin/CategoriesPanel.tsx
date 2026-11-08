"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { MAX_TERM_MONTHS, calculateInstallment, getMinFirstPayment } from "@/lib/calculator";
import styles from "./CategoriesPanel.module.css";

const GLOBAL_SCOPE = "global";

type Partner = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  partnerId: string | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  includeFirstPaymentInMarkup: boolean;
  createdAt: string;
  updatedAt: string;
};

type TermSetting = {
  months: number;
  markupPercent: number | null;
  minDownPaymentPercent: number | null;
};

type CategoryWithTerms = Category & { terms: TermSetting[] };

type DraftRow = { markup: string; minDp: string };

type ParsedCell = { value: number | null; invalid: boolean };

type RowState = {
  markup: ParsedCell;
  minDp: ParsedCell;
  status: "on" | "off" | "error";
};

type BulkState = { from: string; to: string; markup: string; step: string; minDp: string };

class UnauthorizedError extends Error {}

async function request<T>(token: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: init?.method ?? "GET",
    headers: {
      "x-api-key": token,
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 401) throw new UnauthorizedError();
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Ошибка запроса.");
  return data as T;
}

function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(/%/g, "").replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseCell(raw: string): ParsedCell {
  if (!raw.trim()) return { value: null, invalid: false };
  const value = parseNumber(raw);
  if (value === null || value < 0 || value > 100) return { value: null, invalid: true };
  return { value, invalid: false };
}

function formatCell(value: number | null): string {
  if (value === null) return "";
  return String(Number(value.toFixed(4))).replace(".", ",");
}

function emptyRows(): DraftRow[] {
  return Array.from({ length: MAX_TERM_MONTHS }, () => ({ markup: "", minDp: "" }));
}

function rowsFromTerms(terms: TermSetting[]): DraftRow[] {
  const rows = emptyRows();
  for (const term of terms) {
    if (term.months < 1 || term.months > MAX_TERM_MONTHS) continue;
    rows[term.months - 1] = {
      markup: formatCell(term.markupPercent),
      minDp: formatCell(term.minDownPaymentPercent),
    };
  }
  return rows;
}

function getRowState(row: DraftRow): RowState {
  const markup = parseCell(row.markup);
  const minDp = parseCell(row.minDp);
  const markupEmpty = !row.markup.trim();
  const minDpEmpty = !row.minDp.trim();
  let status: RowState["status"] = "on";
  if (markup.invalid || minDp.invalid || markupEmpty !== minDpEmpty) status = "error";
  else if (markupEmpty && minDpEmpty) status = "off";
  return { markup, minDp, status };
}

function snapshot(rows: DraftRow[], include: boolean): string {
  return JSON.stringify({ include, rows: rows.map((row) => [row.markup.trim(), row.minDp.trim()]) });
}

function formatMoney(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function stripTerms(category: CategoryWithTerms | Category): Category {
  const { id, partnerId, name, sortOrder, isActive, includeFirstPaymentInMarkup, createdAt, updatedAt } = category;
  return { id, partnerId, name, sortOrder, isActive, includeFirstPaymentInMarkup, createdAt, updatedAt };
}

const STATUS_LABEL: Record<RowState["status"], string> = {
  on: "В калькуляторе",
  off: "Скрыт",
  error: "Заполните обе ячейки",
};

export function CategoriesPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [scope, setScope] = useState<string>(GLOBAL_SCOPE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CategoryWithTerms | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [draftRows, setDraftRows] = useState<DraftRow[]>(emptyRows);
  const [draftInclude, setDraftInclude] = useState(true);
  const [baseline, setBaseline] = useState(() => snapshot(emptyRows(), true));
  const [nameDraft, setNameDraft] = useState("");

  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exampleCost, setExampleCost] = useState("100 000");
  const [bulk, setBulk] = useState<BulkState>({ from: "3", to: String(MAX_TERM_MONTHS), markup: "", step: "", minDp: "" });

  const tableRef = useRef<HTMLTableElement>(null);
  const detailRequestRef = useRef(0);

  const dirty = detail !== null && snapshot(draftRows, draftInclude) !== baseline;
  const rowStates = draftRows.map(getRowState);
  const errorCount = rowStates.filter((row) => row.status === "error").length;
  const enabledCount = rowStates.filter((row) => row.status === "on").length;
  const exampleCostValue = Number(exampleCost.replace(/\D/g, "")) || 0;

  const handleError = (err: unknown, fallback: string) => {
    if (err instanceof UnauthorizedError) {
      onUnauthorized();
      return;
    }
    setError(err instanceof Error && err.message ? err.message : fallback);
  };

  const applyDetail = (next: CategoryWithTerms) => {
    const rows = rowsFromTerms(next.terms);
    setDetail(next);
    setDraftRows(rows);
    setDraftInclude(next.includeFirstPaymentInMarkup);
    setBaseline(snapshot(rows, next.includeFirstPaymentInMarkup));
    setNameDraft(next.name);
  };

  const confirmDiscard = () => !dirty || confirm("Есть несохранённые изменения в таблице. Отменить их?");

  useEffect(() => {
    request<Partner[]>(token, "/api/admin/partners")
      .then(setPartners)
      .catch((err: unknown) => handleError(err, "Не удалось загрузить партнёров."));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    setError(null);
    setNotice(null);
    request<Category[]>(token, `/api/categories?partnerId=${encodeURIComponent(scope)}`)
      .then((list) => {
        if (cancelled) return;
        setCategories(list);
        setSelectedId(list[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) handleError(err, "Не удалось загрузить категории.");
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    const requestId = ++detailRequestRef.current;
    setDetailLoading(true);
    request<CategoryWithTerms>(token, `/api/categories/${selectedId}`)
      .then((next) => {
        if (requestId === detailRequestRef.current) applyDetail(next);
      })
      .catch((err: unknown) => {
        if (requestId === detailRequestRef.current) handleError(err, "Не удалось загрузить категорию.");
      })
      .finally(() => {
        if (requestId === detailRequestRef.current) setDetailLoading(false);
      });
  }, [token, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const handleScopeChange = (next: string) => {
    if (next === scope || !confirmDiscard()) return;
    setDetail(null);
    setScope(next);
  };

  const handleSelect = (id: string) => {
    if (id === selectedId || !confirmDiscard()) return;
    setNotice(null);
    setSelectedId(id);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name || !confirmDiscard()) return;
    setBusy("create");
    setError(null);
    try {
      const created = await request<CategoryWithTerms>(token, "/api/categories", {
        method: "POST",
        body: { name, partnerId: scope === GLOBAL_SCOPE ? null : scope },
      });
      setCategories((prev) => [...prev, stripTerms(created)]);
      setNewName("");
      setSelectedId(created.id);
      setNotice("Категория создана. Заполните таблицу или нажмите «Заполнить шаблоном».");
    } catch (err) {
      handleError(err, "Не удалось создать категорию.");
    } finally {
      setBusy(null);
    }
  };

  const patchCategory = async (patch: Partial<Pick<Category, "name" | "isActive">>) => {
    if (!detail) return;
    setError(null);
    try {
      const updated = await request<Category>(token, `/api/categories/${detail.id}`, { method: "PATCH", body: patch });
      setCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setDetail((prev) => (prev && prev.id === updated.id ? { ...prev, name: updated.name, isActive: updated.isActive } : prev));
      setNameDraft(updated.name);
    } catch (err) {
      setNameDraft(detail.name);
      handleError(err, "Не удалось обновить категорию.");
    }
  };

  const handleRename = () => {
    const name = nameDraft.trim();
    if (!detail || name === detail.name) return;
    if (!name) {
      setNameDraft(detail.name);
      return;
    }
    void patchCategory({ name });
  };

  const handleDelete = async () => {
    if (!detail) return;
    if (!confirm(`Удалить категорию «${detail.name}» вместе с её настройками?`)) return;
    setBusy("delete");
    setError(null);
    try {
      await request(token, `/api/categories/${detail.id}`, { method: "DELETE" });
      const rest = categories.filter((item) => item.id !== detail.id);
      setCategories(rest);
      setDetail(null);
      setSelectedId(rest[0]?.id ?? null);
      setNotice("Категория удалена.");
    } catch (err) {
      handleError(err, "Не удалось удалить категорию.");
    } finally {
      setBusy(null);
    }
  };

  const handleTemplate = async () => {
    const hasValues = draftRows.some((row) => row.markup.trim() || row.minDp.trim());
    if (hasValues && !confirm("Заменить текущие значения таблицы шаблоном?")) return;
    setBusy("template");
    setError(null);
    try {
      const template = await request<{ includeFirstPaymentInMarkup: boolean; terms: TermSetting[] }>(
        token,
        "/api/categories/defaults/terms",
      );
      setDraftRows(rowsFromTerms(template.terms));
      setDraftInclude(template.includeFirstPaymentInMarkup);
      setNotice("Шаблон подставлен. Проверьте значения и нажмите «Сохранить».");
    } catch (err) {
      handleError(err, "Не удалось загрузить шаблон.");
    } finally {
      setBusy(null);
    }
  };

  const handleClear = () => {
    if (!confirm("Очистить все сроки? Категория не будет показываться в калькуляторе, пока таблица пустая.")) return;
    setDraftRows(emptyRows());
  };

  const bulkFrom = Math.trunc(parseNumber(bulk.from) ?? NaN);
  const bulkTo = Math.trunc(parseNumber(bulk.to) ?? NaN);
  const bulkRangeValid =
    Number.isFinite(bulkFrom) && Number.isFinite(bulkTo) && bulkFrom >= 1 && bulkTo <= MAX_TERM_MONTHS && bulkFrom <= bulkTo;

  const handleBulkApply = () => {
    if (!bulkRangeValid) return;
    const markupStart = parseNumber(bulk.markup);
    const step = parseNumber(bulk.step) ?? 0;
    const minDp = bulk.minDp.trim();
    setDraftRows((prev) =>
      prev.map((row, index) => {
        const months = index + 1;
        if (months < bulkFrom || months > bulkTo) return row;
        const markup =
          markupStart === null ? row.markup : formatCell(Math.max(Number((markupStart + step * (months - bulkFrom)).toFixed(4)), 0));
        return { markup, minDp: minDp ? minDp : row.minDp };
      }),
    );
  };

  const handleBulkHide = () => {
    if (!bulkRangeValid) return;
    setDraftRows((prev) =>
      prev.map((row, index) => (index + 1 >= bulkFrom && index + 1 <= bulkTo ? { markup: "", minDp: "" } : row)),
    );
  };

  const updateCell = (rowIndex: number, column: keyof DraftRow, value: string) => {
    setDraftRows((prev) => prev.map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)));
  };

  const focusCell = (rowIndex: number, columnIndex: number) => {
    const input = tableRef.current?.querySelector<HTMLInputElement>(`[data-cell="${rowIndex}-${columnIndex}"]`);
    input?.focus();
    input?.select();
  };

  const handleCellKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) => {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(Math.min(rowIndex + 1, MAX_TERM_MONTHS - 1), columnIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(Math.max(rowIndex - 1, 0), columnIndex);
    }
  };

  // Accepts a block copied from Excel: rows split by newlines, columns by tabs.
  const handleCellPaste = (event: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, columnIndex: number) => {
    const text = event.clipboardData.getData("text");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();

    const lines = text.replace(/\r/g, "").split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    const grid = lines.map((line) => line.split("\t"));

    // A 3-column block starting with month numbers ("Мес" column) — drop the month column.
    const hasMonthColumn =
      columnIndex === 0 && grid.every((cells) => cells.length >= 3 && /^\s*\d+\s*$/.test(cells[0]));
    const columns: (keyof DraftRow)[] = ["markup", "minDp"];

    setDraftRows((prev) => {
      const next = [...prev];
      grid.forEach((cells, lineIndex) => {
        const targetRow = rowIndex + lineIndex;
        if (targetRow >= MAX_TERM_MONTHS) return;
        const values = hasMonthColumn ? cells.slice(1) : cells;
        const row = { ...next[targetRow] };
        values.forEach((raw, offset) => {
          const column = columns[columnIndex + offset];
          if (!column) return;
          const value = parseNumber(raw);
          row[column] = value === null ? "" : formatCell(value);
        });
        next[targetRow] = row;
      });
      return next;
    });
    setNotice(`Вставлено строк: ${Math.min(grid.length, MAX_TERM_MONTHS - rowIndex)}. Не забудьте сохранить.`);
  };

  const handleReset = () => {
    if (detail) applyDetail(detail);
    setNotice(null);
  };

  const handleSave = async () => {
    if (!detail || errorCount > 0) return;
    setBusy("save");
    setError(null);
    setNotice(null);
    try {
      const terms = rowStates.map((row, index) => ({
        months: index + 1,
        markupPercent: row.markup.value,
        minDownPaymentPercent: row.minDp.value,
      }));
      const saved = await request<CategoryWithTerms>(token, `/api/categories/${detail.id}/settings`, {
        method: "PUT",
        body: { includeFirstPaymentInMarkup: draftInclude, terms },
      });
      applyDetail(saved);
      setCategories((prev) => prev.map((item) => (item.id === saved.id ? stripTerms(saved) : item)));
      setNotice("Настройки сохранены.");
    } catch (err) {
      handleError(err, "Не удалось сохранить настройки.");
    } finally {
      setBusy(null);
    }
  };

  const scopeName =
    scope === GLOBAL_SCOPE ? "Общий режим" : partners.find((partner) => partner.id === scope)?.name ?? "Партнёр";

  return (
    <div className={styles.panel}>
      <div className={`${styles.card} ${styles.scopeBar}`}>
        <label className={styles.scopeField}>
          <span className={styles.label}>Чьи категории настраиваем</span>
          <select className={styles.select} value={scope} onChange={(event) => handleScopeChange(event.target.value)}>
            <option value={GLOBAL_SCOPE}>Общий режим (без партнёра)</option>
            {partners.length > 0 && (
              <optgroup label="Партнёры">
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <p className={styles.scopeHint}>
          {scope === GLOBAL_SCOPE
            ? "Видят все клиенты без партнёрской ссылки, а также клиенты партнёров, у которых нет своих категорий."
            : "Видят только клиенты, пришедшие по ссылке этого партнёра. Пока у партнёра нет включённой категории с заполненными сроками, его клиентам показывается общий режим."}
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {notice && !error && <p className={styles.notice}>{notice}</p>}

      <div className={styles.layout}>
        <aside className={styles.card}>
          <div className={styles.list}>
            {listLoading && <p className={styles.listEmpty}>Загрузка...</p>}
            {!listLoading && categories.length === 0 && (
              <p className={styles.listEmpty}>У «{scopeName}» пока нет категорий.</p>
            )}
            {!listLoading &&
              categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={item.id === selectedId ? `${styles.listItem} ${styles.listItemActive}` : styles.listItem}
                >
                  <span className={styles.listItemName}>{item.name}</span>
                  {!item.isActive && <span className={styles.offBadge}>выкл</span>}
                </button>
              ))}
          </div>
          <form className={styles.createForm} onSubmit={(event) => void handleCreate(event)}>
            <input
              className={styles.input}
              type="text"
              placeholder="Новая категория"
              value={newName}
              maxLength={120}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button type="submit" className={styles.primaryBtn} disabled={busy === "create" || !newName.trim()}>
              {busy === "create" ? "..." : "Добавить"}
            </button>
          </form>
        </aside>

        <section className={`${styles.card} ${styles.editor}`}>
          {!detail && (
            <p className={styles.placeholder}>
              {detailLoading || listLoading ? "Загрузка..." : "Создайте категорию слева, чтобы настроить условия рассрочки."}
            </p>
          )}

          {detail && (
            <>
              <div className={styles.editorSection}>
                <div className={styles.editorHeader}>
                  <input
                    className={styles.nameInput}
                    value={nameDraft}
                    maxLength={120}
                    aria-label="Название категории"
                    title="Нажмите, чтобы переименовать"
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        setNameDraft(detail.name);
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <button type="button" className={styles.dangerBtn} disabled={busy === "delete"} onClick={() => void handleDelete()}>
                    {busy === "delete" ? "Удаляем..." : "Удалить"}
                  </button>
                </div>

                <label className={styles.toggleRow}>
                  <input
                    type="checkbox"
                    checked={detail.isActive}
                    onChange={(event) => void patchCategory({ isActive: event.target.checked })}
                  />
                  <span className={styles.switch} />
                  <span className={styles.toggleText}>
                    Показывать в калькуляторе
                    <small>Сохраняется сразу. Выключенная категория скрыта от клиентов, настройки остаются.</small>
                  </span>
                </label>

                <label className={styles.toggleRow}>
                  <input type="checkbox" checked={draftInclude} onChange={(event) => setDraftInclude(event.target.checked)} />
                  <span className={styles.switch} />
                  <span className={styles.toggleText}>
                    Включать первый взнос в наценку
                    <small>
                      {draftInclude
                        ? "Сейчас: наценка начисляется на полную стоимость товара."
                        : "Сейчас: наценка начисляется только на остаток после первого взноса."}
                    </small>
                  </span>
                </label>

                {detail.isActive && enabledCount === 0 && (
                  <p className={styles.error}>Категория не появится в калькуляторе: нет ни одного заполненного срока.</p>
                )}
              </div>

              <div className={styles.editorSection}>
                <div className={styles.toolbar}>
                  <button type="button" className={styles.ghostBtn} disabled={busy === "template"} onClick={() => void handleTemplate()}>
                    {busy === "template" ? "Загрузка..." : "Заполнить шаблоном"}
                  </button>
                  <button type="button" className={styles.ghostBtn} onClick={handleClear}>
                    Очистить всё
                  </button>
                </div>

                <div className={styles.bulk}>
                  <span>Сроки с</span>
                  <input
                    className={styles.bulkInput}
                    inputMode="numeric"
                    value={bulk.from}
                    onChange={(event) => setBulk((prev) => ({ ...prev, from: event.target.value }))}
                    aria-label="С месяца"
                  />
                  <span>по</span>
                  <input
                    className={styles.bulkInput}
                    inputMode="numeric"
                    value={bulk.to}
                    onChange={(event) => setBulk((prev) => ({ ...prev, to: event.target.value }))}
                    aria-label="По месяц"
                  />
                  <span>мес.: наценка</span>
                  <input
                    className={styles.bulkInput}
                    inputMode="decimal"
                    placeholder="5"
                    value={bulk.markup}
                    onChange={(event) => setBulk((prev) => ({ ...prev, markup: event.target.value }))}
                    aria-label="Наценка, %"
                  />
                  <span>% шаг</span>
                  <input
                    className={styles.bulkInput}
                    inputMode="decimal"
                    placeholder="-0,1"
                    value={bulk.step}
                    onChange={(event) => setBulk((prev) => ({ ...prev, step: event.target.value }))}
                    aria-label="Шаг наценки на каждый месяц, %"
                  />
                  <span>ПВ</span>
                  <input
                    className={styles.bulkInput}
                    inputMode="decimal"
                    placeholder="20"
                    value={bulk.minDp}
                    onChange={(event) => setBulk((prev) => ({ ...prev, minDp: event.target.value }))}
                    aria-label="Минимальный первый взнос, %"
                  />
                  <span>%</span>
                  <button type="button" className={styles.primaryBtn} disabled={!bulkRangeValid} onClick={handleBulkApply}>
                    Применить
                  </button>
                  <button type="button" className={styles.ghostBtn} disabled={!bulkRangeValid} onClick={handleBulkHide}>
                    Скрыть сроки
                  </button>
                </div>

                <p className={styles.hint}>
                  Пустые ячейки — срок не показывается в калькуляторе. Пустое поле в быстром заполнении не меняет колонку;
                  шаг прибавляется к наценке на каждый следующий месяц. Можно вставить столбцы прямо из Excel: выделите
                  ячейку и нажмите Ctrl+V. Enter и стрелки переходят между строками.
                </p>

                <label className={styles.bulk} style={{ width: "fit-content" }}>
                  <span>Пример расчёта для стоимости</span>
                  <input
                    className={styles.bulkInput}
                    style={{ width: "6.5rem" }}
                    inputMode="numeric"
                    value={exampleCost}
                    onChange={(event) => {
                      const digits = Number(event.target.value.replace(/\D/g, ""));
                      setExampleCost(digits ? digits.toLocaleString("ru-RU") : "");
                    }}
                  />
                  <span>₽ при минимальном взносе</span>
                </label>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table} ref={tableRef}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center" }}>Мес</th>
                      <th>% наценки в месяц</th>
                      <th>% ПВ от стоимости</th>
                      <th>Пример: платёж / мес</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftRows.map((row, index) => {
                      const state = rowStates[index];
                      const months = index + 1;
                      let example: { monthly: number; firstPayment: number } | null = null;
                      if (state.status === "on" && exampleCostValue > 0) {
                        const firstPayment = getMinFirstPayment(exampleCostValue, state.minDp.value ?? 0);
                        const { monthlyPayment } = calculateInstallment({
                          cost: exampleCostValue,
                          firstPayment,
                          period: months,
                          markupPercent: state.markup.value ?? 0,
                          includeFirstPaymentInMarkup: draftInclude,
                        });
                        example = { monthly: monthlyPayment, firstPayment };
                      }
                      const rowClass = [
                        state.status === "off" ? styles.rowOff : "",
                        state.status === "error" ? styles.rowError : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const statusClass =
                        state.status === "on" ? styles.statusOn : state.status === "off" ? styles.statusOff : styles.statusError;

                      return (
                        <tr key={months} className={rowClass || undefined}>
                          <td className={styles.monthCell}>{months}</td>
                          {(["markup", "minDp"] as const).map((column, columnIndex) => {
                            const cell = state[column];
                            const missing = state.status === "error" && !row[column].trim();
                            return (
                              <td key={column} className={styles.numCell}>
                                <span className={styles.cellInputWrap}>
                                  <input
                                    className={
                                      cell.invalid || missing ? `${styles.cellInput} ${styles.cellInputInvalid}` : styles.cellInput
                                    }
                                    data-cell={`${index}-${columnIndex}`}
                                    inputMode="decimal"
                                    placeholder="—"
                                    value={row[column]}
                                    aria-label={`${column === "markup" ? "Наценка" : "Первый взнос"}, ${months} мес.`}
                                    onChange={(event) => updateCell(index, column, event.target.value)}
                                    onKeyDown={(event) => handleCellKeyDown(event, index, columnIndex)}
                                    onPaste={(event) => handleCellPaste(event, index, columnIndex)}
                                    onFocus={(event) => event.currentTarget.select()}
                                  />
                                  <span className={styles.percentSign}>%</span>
                                </span>
                              </td>
                            );
                          })}
                          <td className={styles.exampleCell}>
                            {example ? (
                              <>
                                <strong>{formatMoney(example.monthly)}</strong>
                                {example.firstPayment > 0 && (
                                  <span style={{ color: "rgba(11,20,37,0.45)", fontSize: "0.74rem" }}>
                                    {" "}
                                    · ПВ {formatMoney(example.firstPayment)}
                                  </span>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={`${styles.status} ${statusClass}`}>
                              {state.markup.invalid || state.minDp.invalid ? "Число от 0 до 100" : STATUS_LABEL[state.status]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.saveBar}>
                <span className={dirty ? `${styles.saveState} ${styles.saveStateDirty}` : styles.saveState}>
                  {errorCount > 0
                    ? `Исправьте строки с ошибками: ${errorCount}`
                    : dirty
                      ? "Есть несохранённые изменения"
                      : `Сохранено · сроков в калькуляторе: ${enabledCount}`}
                </span>
                <div className={styles.saveActions}>
                  <button type="button" className={styles.ghostBtn} disabled={!dirty || busy === "save"} onClick={handleReset}>
                    Отменить
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={!dirty || errorCount > 0 || busy === "save"}
                    onClick={() => void handleSave()}
                  >
                    {busy === "save" ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}