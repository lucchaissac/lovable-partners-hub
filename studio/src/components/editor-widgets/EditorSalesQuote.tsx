import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Dropdown,
  FormField,
  Icon,
  Input,
  Tabs,
  TabsItem,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@asset/ui";
import {
  freshQuoteOption,
  freshQuoteSection,
  quoteLineTotal,
  quoteSectionTotal,
  quoteOptionTotal,
  type EditorQuoteValue,
  type QuoteAdjustment,
  type QuoteLine,
  type QuoteOption,
  type QuoteSection,
  type QuoteTerms,
} from "./complexWidgetModels";
import "./editor-complex-widgets.css";
export { SAMPLE_QUOTE, EMPTY_QUOTE } from "./complexWidgetModels";
export type { EditorQuoteValue } from "./complexWidgetModels";
const PRODUCTS = [
  { name: "Team platform", price: 120 },
  { name: "Onboarding workshop", price: 500 },
  { name: "Premium support", price: 250 },
];
const columns = [
  "Quantity",
  "Unit price",
  "Pricing model",
  "Discount",
] as const;
function Adjustment({
  value,
  onChange,
  label,
  currency,
}: {
  value: QuoteAdjustment;
  onChange: (value: QuoteAdjustment) => void;
  label: string;
  currency: string;
}) {
  return (
    <div className="ecw-adjustment">
      <Input
        inputSize="sm"
        type="number"
        min={0}
        max={value.type === "percent" ? 100 : undefined}
        aria-label={label}
        value={value.amount}
        onChange={(e) =>
          onChange({
            ...value,
            amount: Math.max(
              0,
              Math.min(
                value.type === "percent" ? 100 : Infinity,
                Number(e.target.value),
              ),
            ),
          })
        }
      />
      <Dropdown
        value={value.type}
        listHeight="auto"
        items={[
          { id: "percent", label: "Percent (%)" },
          { id: "fixed", label: "Fixed amount" },
        ]}
        onChange={(type) =>
          onChange({
            ...value,
            type: type as QuoteAdjustment["type"],
            amount: 0,
          })
        }
        trigger={
          <Button size="sm" variant="neutral" aria-label={`${label} type`}>
            {value.type === "percent" ? "%" : currency}
          </Button>
        }
      />
    </div>
  );
}
export function EditorSalesQuote({
  value,
  onChange,
  initialEditor = false,
}: {
  value: EditorQuoteValue;
  onChange: (value: EditorQuoteValue) => void;
  initialEditor?: boolean;
}) {
  const [editing, setEditing] = useState(initialEditor),
    [terms, setTerms] = useState<QuoteTerms>(),
    [library, setLibrary] = useState<string>(),
    [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<QuoteOption>(),
    [notice, setNotice] = useState(""),
    [order, setOrder] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]),
    [discounts, setDiscounts] = useState<string[]>([]),
    [taxOpen, setTaxOpen] = useState(false);
  const option =
    value.options.find((option) => option.id === value.selected) ||
    value.options[0];
  const totals = quoteOptionTotal(option),
    lineCount = option.sections.reduce((n, s) => n + s.lines.length, 0);
  const frequencies = [
    ...new Set(
      option.sections.flatMap((section) =>
        section.lines.map((line) => line.frequency),
      ),
    ),
  ];
  const frequencyLabel =
    frequencies.length === 0
      ? option.billingFrequency || "Annual"
      : frequencies.length === 1
        ? frequencies[0]
        : "One or multiple";
  const money = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: value.currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  const patchOption = (patch: Partial<QuoteOption>) =>
    onChange({
      ...value,
      status: "draft",
      options: value.options.map((item) =>
        item.id === option.id ? { ...item, ...patch } : item,
      ),
    });
  const patchSection = (section: QuoteSection, patch: Partial<QuoteSection>) =>
    patchOption({
      sections: option.sections.map((item) =>
        item.id === section.id ? { ...item, ...patch } : item,
      ),
    });
  const patchLine = (
    section: QuoteSection,
    line: QuoteLine,
    patch: Partial<QuoteLine>,
  ) =>
    patchSection(section, {
      lines: section.lines.map((item) =>
        item.id === line.id ? { ...item, ...patch } : item,
      ),
    });
  const addLine = (
    section: QuoteSection,
    product?: (typeof PRODUCTS)[number],
  ) =>
    patchSection(section, {
      lines: [
        ...section.lines,
        {
          id: crypto.randomUUID(),
          name: product?.name || "",
          quantity: 1,
          unitPrice: product?.price || 0,
          frequency: option.billingFrequency || "Annual",
          discount: { amount: 0, type: "percent" },
        },
      ],
    });
  const cloneOption = () => {
    const next = {
      ...structuredClone(option),
      id: crypto.randomUUID(),
      name: `${option.name} copy`,
      sections: option.sections.map((section) => ({
        ...structuredClone(section),
        id: crypto.randomUUID(),
        lines: section.lines.map((line) => ({
          ...line,
          id: crypto.randomUUID(),
        })),
      })),
    };
    onChange({
      ...value,
      status: "draft",
      selected: next.id,
      options: [...value.options, next],
    });
  };
  const summary = (
    <div className="ecw-quote-table-wrap">
      <table className="ecw-quote-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {option.sections
            .flatMap((section) => section.lines)
            .map((line) => (
              <tr key={line.id}>
                <td>{line.name || "Untitled product"}</td>
                <td>{line.quantity}</td>
                <td>
                  {money(Math.round(line.unitPrice * 100))}
                  <small>{line.frequency}</small>
                </td>
                <td>{money(quoteLineTotal(line))}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="ecw-quote-total">
        <span>Total</span>
        <strong>{money(totals.total)}</strong>
      </div>
    </div>
  );
  return (
    <section className="ecw-quote" aria-label="Sales quote widget">
      <header className="ecw-heading">
        <Input
          aria-label="Quote title"
          placeholder="Untitled"
          value={value.title}
          onChange={(e) =>
            onChange({ ...value, status: "draft", title: e.target.value })
          }
        />
        <Button variant="neutral" size="sm" onClick={() => setEditing(true)}>
          Add product
        </Button>
        <Dropdown
          listHeight="auto"
          items={[{ id: "preview", label: "Preview order form" }]}
          onChange={() => setOrder(true)}
          trigger={
            <Button
              variant="primary"
              size="sm"
              disabled={!lineCount}
              trailingIcon={<Icon name="chevron-down" size={14} />}
            >
              Create order form
            </Button>
          }
        />
      </header>
      {lineCount ? (
        summary
      ) : (
        <div className="ecw-quote-empty">
          <div aria-hidden="true" className="ecw-quote-skeleton">
            {[1, 2, 3, 4, 5].map((id) => (
              <i key={id} />
            ))}
          </div>
          <Button variant="primary" onClick={() => setEditing(true)}>
            Add product to start
          </Button>
        </div>
      )}
      {lineCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Icon name="pencil" size={14} />}
          onClick={() => setEditing(true)}
        >
          Edit quote
        </Button>
      )}
      {notice && (
        <p role="status" className="ecw-muted">
          {notice}
        </p>
      )}
      {editing &&
        createPortal(
          <Dialog
            open
            width="min(1400px,96vw)"
            className="ecw-quote-dialog"
            overlayClassName="ecw-quote-overlay"
            dividers
            ariaLabel="Pricing quote editor"
            onClose={() => setEditing(false)}
            closeOnEscape={!terms && !library && !renaming}
          >
            <header className="ecw-quote-editor-header">
              <span>New pricing quote /</span>
              <Input
                aria-label="Pricing quote name"
                placeholder="Untitled"
                value={value.title}
                onChange={(e) =>
                  onChange({ ...value, status: "draft", title: e.target.value })
                }
              />
              <span />
              <Button
                variant="neutral"
                size="sm"
                disabled
                leadingIcon={<Icon name="sparkles" size={14} />}
                title="AI generation is not connected in this pilot"
              >
                Ask AI
              </Button>
              <Button
                variant="neutral"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setNotice("Draft saved in this preview.");
                }}
              >
                Save for later
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={
                  !lineCount ||
                  option.sections.some((section) =>
                    section.lines.some((line) => !line.name.trim()),
                  )
                }
                onClick={() => {
                  onChange({ ...value, status: "published" });
                  setEditing(false);
                  setNotice(
                    "Quote preview published locally. No order form was sent.",
                  );
                }}
              >
                Publish quote
              </Button>
            </header>
            <DialogBody>
              <div className="ecw-quote-editor">
                <Tabs
                  value={option.id}
                  onValueChange={(selected) => onChange({ ...value, selected })}
                >
                  <TabsList aria-label="Quote options">
                    {value.options.map((item) => (
                      <TabsItem key={item.id}>
                        <TabsTrigger value={item.id}>{item.name}</TabsTrigger>
                        {item.id === option.id && (
                          <Dropdown
                            listHeight="auto"
                            items={[
                              { id: "rename", label: "Rename" },
                              { id: "duplicate", label: "Duplicate" },
                              {
                                id: "delete",
                                label: "Delete option",
                                disabled: value.options.length === 1,
                              },
                            ]}
                            onChange={(action) => {
                              if (action === "rename")
                                setRenaming({ ...option });
                              if (action === "duplicate") cloneOption();
                              if (
                                action === "delete" &&
                                value.options.length > 1
                              ) {
                                const options = value.options.filter(
                                  (item) => item.id !== option.id,
                                );
                                onChange({
                                  ...value,
                                  status: "draft",
                                  options,
                                  selected: options[0].id,
                                });
                              }
                            }}
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label="Option actions"
                                leadingIcon={<Icon name="ellipsis" size={14} />}
                              />
                            }
                          />
                        )}
                      </TabsItem>
                    ))}
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = freshQuoteOption();
                      onChange({
                        ...value,
                        status: "draft",
                        options: [...value.options, next],
                        selected: next.id,
                      });
                    }}
                  >
                    + Add option
                  </Button>
                </Tabs>
                <div className="ecw-quote-settings">
                  <span>Billing frequency</span>
                  <Dropdown
                    value={
                      frequencies.length === 1
                        ? frequencies[0]
                        : option.billingFrequency || "Annual"
                    }
                    listHeight="auto"
                    items={["Annual", "Monthly", "One-time"].map((id) => ({
                      id,
                      label: id,
                    }))}
                    onChange={(frequency) =>
                      patchOption({
                        billingFrequency: frequency as QuoteLine["frequency"],
                        sections: option.sections.map((section) => ({
                          ...section,
                          lines: section.lines.map((line) => ({
                            ...line,
                            frequency: frequency as QuoteLine["frequency"],
                          })),
                        })),
                      })
                    }
                    trigger={
                      <Button
                        variant="neutral"
                        size="sm"
                        trailingIcon={<Icon name="chevron-down" size={14} />}
                      >
                        {frequencyLabel}
                      </Button>
                    }
                  />
                  <span />
                  <Dropdown
                    value={value.currency}
                    listHeight="auto"
                    items={["USD", "EUR", "GBP", "CAD", "AUD"].map((id) => ({
                      id,
                      label: id,
                    }))}
                    onChange={(currency) =>
                      onChange({ ...value, status: "draft", currency })
                    }
                    trigger={
                      <Button
                        variant="neutral"
                        size="sm"
                        trailingIcon={<Icon name="chevron-down" size={14} />}
                      >
                        {value.currency}
                      </Button>
                    }
                  />
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => setTerms(structuredClone(value.terms))}
                  >
                    Edit terms
                  </Button>
                </div>
                {option.sections.map((section) => (
                  <section className="ecw-quote-section" key={section.id}>
                    <header>
                      <Input
                        aria-label={`Section title ${section.id}`}
                        placeholder="Untitled"
                        value={section.title}
                        onChange={(e) =>
                          patchSection(section, { title: e.target.value })
                        }
                      />
                      <Dropdown
                        listHeight="auto"
                        items={columns.map((column) => ({
                          id: column,
                          label: column,
                          leadingIcon: (
                            <Icon
                              name={
                                hiddenColumns.includes(column)
                                  ? "square"
                                  : "check"
                              }
                              size={14}
                            />
                          ),
                        }))}
                        onChange={(column) =>
                          setHiddenColumns((current) =>
                            current.includes(column)
                              ? current.filter((item) => item !== column)
                              : [...current, column],
                          )
                        }
                        trigger={
                          <Button variant="neutral" size="sm">
                            Edit columns
                          </Button>
                        }
                      />
                      <Dropdown
                        listHeight="auto"
                        items={[
                          {
                            id: "delete",
                            label: "Delete section",
                            disabled: option.sections.length === 1,
                          },
                        ]}
                        onChange={() =>
                          patchOption({
                            sections: option.sections.filter(
                              (item) => item.id !== section.id,
                            ),
                          })
                        }
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Section options ${section.title || "Untitled"}`}
                            leadingIcon={<Icon name="ellipsis" size={16} />}
                          />
                        }
                      />
                    </header>
                    <div className="ecw-quote-table-wrap">
                      <table className="ecw-quote-table ecw-quote-table--editing">
                        <thead>
                          <tr>
                            <th>Product</th>
                            {columns
                              .filter(
                                (column) => !hiddenColumns.includes(column),
                              )
                              .map((column) => (
                                <th key={column}>{column}</th>
                              ))}
                            <th>Total</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {section.lines.map((line) => (
                            <tr key={line.id}>
                              <td>
                                <Input
                                  inputSize="sm"
                                  aria-label={`Product name ${line.id}`}
                                  placeholder="Product name"
                                  value={line.name}
                                  onChange={(e) =>
                                    patchLine(section, line, {
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              {!hiddenColumns.includes("Quantity") && (
                                <td>
                                  <Input
                                    inputSize="sm"
                                    type="number"
                                    min={0}
                                    aria-label={`Quantity for ${line.name || "product"}`}
                                    value={line.quantity}
                                    onChange={(e) =>
                                      patchLine(section, line, {
                                        quantity: Math.max(
                                          0,
                                          Number(e.target.value),
                                        ),
                                      })
                                    }
                                  />
                                </td>
                              )}
                              {!hiddenColumns.includes("Unit price") && (
                                <td>
                                  <Input
                                    inputSize="sm"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    aria-label={`Unit price for ${line.name || "product"}`}
                                    value={line.unitPrice}
                                    onChange={(e) =>
                                      patchLine(section, line, {
                                        unitPrice: Math.max(
                                          0,
                                          Number(e.target.value),
                                        ),
                                      })
                                    }
                                  />
                                </td>
                              )}
                              {!hiddenColumns.includes("Pricing model") && (
                                <td>Per unit</td>
                              )}
                              {!hiddenColumns.includes("Discount") && (
                                <td>
                                  <Adjustment
                                    currency={value.currency}
                                    label={`Discount for ${line.name || "product"}`}
                                    value={line.discount}
                                    onChange={(discount) =>
                                      patchLine(section, line, { discount })
                                    }
                                  />
                                </td>
                              )}
                              <td>{money(quoteLineTotal(line))}</td>
                              <td>
                                <Dropdown
                                  listHeight="auto"
                                  items={[
                                    { id: "duplicate", label: "Duplicate" },
                                    { id: "delete", label: "Delete" },
                                  ]}
                                  onChange={(id) =>
                                    patchSection(section, {
                                      lines:
                                        id === "delete"
                                          ? section.lines.filter(
                                              (item) => item.id !== line.id,
                                            )
                                          : [
                                              ...section.lines,
                                              {
                                                ...line,
                                                id: crypto.randomUUID(),
                                              },
                                            ],
                                    })
                                  }
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Options for ${line.name || "product"}`}
                                      leadingIcon={
                                        <Icon name="ellipsis" size={16} />
                                      }
                                    />
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Dropdown
                      listHeight="auto"
                      items={[
                        {
                          id: "custom",
                          label: "Custom line item",
                          leadingIcon: <Icon name="plus" size={16} />,
                        },
                        {
                          id: "library",
                          label: "Product library",
                          leadingIcon: <Icon name="library" size={16} />,
                        },
                      ]}
                      onChange={(id) => {
                        if (id === "custom") addLine(section);
                        else {
                          setLibrary(section.id);
                          setQuery("");
                        }
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          + Add line item
                        </Button>
                      }
                    />
                    {section.showSubtotal && (
                      <div className="ecw-totals">
                        <div>
                          <span>Subtotal</span>
                          <span>
                            {money(
                              section.lines.reduce(
                                (n, l) => n + quoteLineTotal(l),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                        {discounts.includes(section.id) ||
                        section.discount.amount > 0 ? (
                          <div>
                            <span>Discount</span>
                            <Adjustment
                              currency={value.currency}
                              label={`Section discount ${section.id}`}
                              value={section.discount}
                              onChange={(discount) =>
                                patchSection(section, { discount })
                              }
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDiscounts([...discounts, section.id])
                            }
                          >
                            + Add discount
                          </Button>
                        )}
                        <div className="ecw-total-final">
                          <strong>Subtotal</strong>
                          <strong>{money(quoteSectionTotal(section))}</strong>
                        </div>
                      </div>
                    )}
                    <div className="ecw-totals-toggle">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          patchSection(section, {
                            showSubtotal: !section.showSubtotal,
                          })
                        }
                      >
                        {section.showSubtotal
                          ? "Hide subtotal"
                          : "Show subtotal"}
                      </Button>
                    </div>
                  </section>
                ))}
                <Button
                  className="ecw-add-section"
                  variant="neutral"
                  onClick={() =>
                    patchOption({
                      sections: [...option.sections, freshQuoteSection()],
                    })
                  }
                >
                  + Add section
                </Button>
                <div className="ecw-quote-section">
                  <header>
                    <strong>Totals summary</strong>
                    <span />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        patchOption({ showTotals: !option.showTotals })
                      }
                    >
                      {option.showTotals ? "Hide" : "Show"}
                    </Button>
                  </header>
                  {option.showTotals && (
                    <div className="ecw-totals">
                      {discounts.includes(option.id) ||
                      option.discount.amount > 0 ? (
                        <div>
                          <span>Discount</span>
                          <Adjustment
                            currency={value.currency}
                            label="Quote discount"
                            value={option.discount}
                            onChange={(discount) => patchOption({ discount })}
                          />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDiscounts([...discounts, option.id])
                          }
                        >
                          + Add discount
                        </Button>
                      )}
                      {taxOpen || option.tax > 0 ? (
                        <div>
                          <span>Tax (%)</span>
                          <Input
                            inputSize="sm"
                            type="number"
                            min={0}
                            max={100}
                            aria-label="Tax rate"
                            value={option.tax}
                            onChange={(e) =>
                              patchOption({
                                tax: Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              })
                            }
                          />
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTaxOpen(true)}
                        >
                          + Add tax
                        </Button>
                      )}
                      <div className="ecw-total-final">
                        <strong>Total</strong>
                        <strong>{money(totals.total)}</strong>
                      </div>
                    </div>
                  )}
                </div>
                <section className="ecw-quote-section">
                  <header>
                    <strong>Terms</strong>
                    <span />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setTerms(structuredClone(value.terms))}
                    >
                      Edit terms <Icon name="chevron-right" size={14} />
                    </Button>
                  </header>
                  <dl className="ecw-terms-list">
                    {[
                      ["Contract length", value.terms.length],
                      [
                        "Contract dates",
                        [value.terms.start, value.terms.end]
                          .filter(Boolean)
                          .join(" – "),
                      ],
                      ["Billing start date", value.terms.billingStart],
                      ["Billing terms", value.terms.billingTerms],
                      ["Payment term", value.terms.paymentTerm],
                      ["Payment methods", value.terms.paymentMethods],
                    ].map(([label, text]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setTerms(structuredClone(value.terms))
                            }
                          >
                            {text || "—"}
                          </Button>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p>Marketing rights</p>
                  <div className="ecw-marketing">
                    {["Logo", "Quote", "Case study"].map((label) => (
                      <Button
                        key={label}
                        variant="neutral"
                        size="sm"
                        aria-pressed={value.terms.marketing.includes(label)}
                        active={value.terms.marketing.includes(label)}
                        onClick={() =>
                          onChange({
                            ...value,
                            status: "draft",
                            terms: {
                              ...value.terms,
                              marketing: value.terms.marketing.includes(label)
                                ? value.terms.marketing.filter(
                                    (item) => item !== label,
                                  )
                                : [...value.terms.marketing, label],
                            },
                          })
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <FormField label="Additional terms">
                    <Textarea
                      value={value.terms.additional}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          status: "draft",
                          terms: { ...value.terms, additional: e.target.value },
                        })
                      }
                    />
                  </FormField>
                </section>
              </div>
            </DialogBody>
          </Dialog>,
          document.body,
        )}
      {terms &&
        createPortal(
          <Dialog
            open
            width={560}
            onClose={() => setTerms(undefined)}
            ariaLabel="Quote terms"
            dividers
          >
            <DialogHeader
              title="Edit terms"
              onClose={() => setTerms(undefined)}
            />
            <DialogBody>
              <div className="ecw-terms-form">
                {(
                  [
                    ["length", "Contract length"],
                    ["start", "Contract start date"],
                    ["end", "Contract end date"],
                    ["billingStart", "Billing start date"],
                    ["billingTerms", "Billing terms"],
                    ["paymentTerm", "Payment term"],
                    ["paymentMethods", "Payment methods"],
                  ] as const
                ).map(([key, label]) => (
                  <FormField key={key} label={label}>
                    <Input
                      aria-label={label}
                      type={
                        ["start", "end", "billingStart"].includes(key)
                          ? "date"
                          : "text"
                      }
                      value={terms[key]}
                      onChange={(e) =>
                        setTerms({ ...terms, [key]: e.target.value })
                      }
                    />
                  </FormField>
                ))}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="neutral" onClick={() => setTerms(undefined)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={
                  !!terms.start && !!terms.end && terms.end < terms.start
                }
                onClick={() => {
                  onChange({ ...value, status: "draft", terms });
                  setTerms(undefined);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
      {library &&
        createPortal(
          <Dialog
            open
            width={540}
            onClose={() => setLibrary(undefined)}
            ariaLabel="Product library"
            dividers
          >
            <DialogHeader
              title="Product library"
              onClose={() => setLibrary(undefined)}
            />
            <DialogBody>
              <Input
                aria-label="Search products"
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="ecw-picker">
                {PRODUCTS.filter((p) =>
                  p.name.toLowerCase().includes(query.toLowerCase()),
                ).map((p) => (
                  <div key={p.name}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{money(p.price * 100)}</small>
                    </div>
                    <Button
                      size="sm"
                      variant="neutral"
                      onClick={() => {
                        const section = option.sections.find(
                          (s) => s.id === library,
                        );
                        if (section) addLine(section, p);
                        setLibrary(undefined);
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
              <p className="ecw-muted">Fictional products for this preview.</p>
            </DialogBody>
          </Dialog>,
          document.body,
        )}
      {renaming &&
        createPortal(
          <Dialog
            open
            width={400}
            onClose={() => setRenaming(undefined)}
            ariaLabel="Rename option"
            dividers
          >
            <DialogHeader
              title="Rename option"
              onClose={() => setRenaming(undefined)}
            />
            <DialogBody>
              <Input
                aria-label="Option name"
                value={renaming.name}
                onChange={(e) =>
                  setRenaming({ ...renaming, name: e.target.value })
                }
              />
            </DialogBody>
            <DialogFooter>
              <Button
                variant="primary"
                disabled={!renaming.name.trim()}
                onClick={() => {
                  patchOption({ name: renaming.name });
                  setRenaming(undefined);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
      {order &&
        createPortal(
          <Dialog
            open
            width={800}
            onClose={() => setOrder(false)}
            ariaLabel="Order form preview"
            dividers
          >
            <DialogHeader
              title={value.title || "Order form"}
              onClose={() => setOrder(false)}
            />
            <DialogBody>
              {summary}
              <p className="ecw-muted">
                Local preview only. Signatures, documents, payments and sending
                need a connected workspace.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="neutral" onClick={() => setOrder(false)}>
                Close
              </Button>
            </DialogFooter>
          </Dialog>,
          document.body,
        )}
    </section>
  );
}
