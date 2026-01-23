"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HelpCircle,
  Shield,
  Lock,
  Settings,
  Wifi,
  SearchIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ConnectionStatus = "idle" | "connected" | "failed";

interface ScanConfigurationProps {
  connectionStatus: ConnectionStatus;
  connectedDb: string;
  selectedTests: string[];
  onSelectedTestsChange: (tests: string[]) => void;
  onRunScan: (argsPayload: Record<string, any>) => void;
  extraArgs?: Record<string, Record<string, any>>;
}

interface ScanTest {
  id: string;
  name: string;
  details: string;
  severity: "low" | "medium" | "high" | "critical";
  icon: string;
  category_tags: string[];
  args?: Array<any>;
}

const iconMap = { Shield, HelpCircle, Lock, Settings };
const severityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning-muted text-warning",
  high: "bg-warning text-warning-foreground",
  critical: "bg-destructive text-destructive-foreground",
};

const PAGE_SIZE = 5;

export function ScanConfiguration({
  connectionStatus,
  connectedDb,
  selectedTests,
  onSelectedTestsChange,
  onRunScan,
  extraArgs = {},
}: ScanConfigurationProps) {
  const [scanTests, setScanTests] = useState<ScanTest[]>([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [testsArgsValues, setTestsArgsValues] = useState<Record<string, any>>(
    {},
  );

  // ---------------------- Fetch Tests ----------------------
  useEffect(() => {
    async function fetchTests() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL}/get-tests`,
        );
        if (!res.ok) throw new Error("Failed to fetch tests");
        const data: ScanTest[] = await res.json();
        setScanTests(data);

        if (selectedTests.length === 0) {
          const recommendedIds = data
            .filter((t) => t.category_tags.includes("recommended"))
            .map((t) => t.id);
          onSelectedTestsChange(recommendedIds);

          const initialArgs: Record<string, any> = {};
          recommendedIds.forEach((testId) => {
            const test = data.find((t) => t.id === testId);
            if (test?.args) {
              initialArgs[testId] = initializeArgs(
                test.args ?? [],
                extraArgs[testId] || {},
              );
            }
          });
          setTestsArgsValues(initialArgs);
        }
      } catch (err: any) {
        setError(err.message || "Error loading tests");
      }
    }
    fetchTests();
  }, []);

  // ---------------------- Initialize Args ----------------------
  function initializeArgs(argsDef: any[], extras: any = {}) {
    const values: any = {};
    argsDef.forEach((arg) => {
      if (!arg.name) return;
      if (arg.type === "object" && arg.properties) {
        values[arg.name] = initializeArgs(
          Object.entries(arg.properties).map(([key, val]: any) => ({
            ...val,
            name: key,
          })),
          extras[arg.name] || {},
        );
      } else if (arg.type === "array") {
        values[arg.name] =
          extras[arg.name] ?? (arg.items?.default ? [arg.items.default] : []);
      } else {
        values[arg.name] = extras[arg.name] ?? arg.default ?? "";
      }
    });
    return values;
  }

  // ---------------------- Category + Filters ----------------------
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    scanTests.forEach((t) =>
      t.category_tags.forEach((cat) => categories.add(cat)),
    );
    return ["all", ...Array.from(categories).sort()];
  }, [scanTests]);

  const filteredTests = useMemo(() => {
    return scanTests.filter((t) => {
      if (
        selectedCategory !== "all" &&
        !t.category_tags.includes(selectedCategory)
      )
        return false;
      const lowerSearch = searchTerm.toLowerCase();
      return (
        t.name.toLowerCase().includes(lowerSearch) ||
        t.details.toLowerCase().includes(lowerSearch)
      );
    });
  }, [scanTests, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / PAGE_SIZE));
  const pagedTests = filteredTests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredTests, totalPages]);

  useEffect(() => setCurrentPage(1), [searchTerm, selectedCategory]);

  // ---------------------- Toggle Tests ----------------------
  const handleTestToggle = (testId: string) => {
    let newTests: string[];
    if (selectedTests.includes(testId)) {
      newTests = selectedTests.filter((id) => id !== testId);
      setTestsArgsValues((prev) => {
        const copy = { ...prev };
        delete copy[testId];
        return copy;
      });
    } else {
      newTests = [...selectedTests, testId];
      const test = scanTests.find((t) => t.id === testId);
      if (test?.args) {
        setTestsArgsValues((prev) => ({
          ...prev,
          [testId]: initializeArgs(test.args ?? [], extraArgs[testId] || {}),
        }));
      }
    }
    onSelectedTestsChange(newTests);
  };

  // ---------------------- Render Arg Inputs ----------------------
  const renderArgInput = (
    testId: string,
    arg: any,
    value: any,
    onChange: (val: any) => void,
    path: string[] = [],
  ): React.ReactNode => {
    const fullPath = [...path, arg.name];
    const key = fullPath.join(".");

    if (arg.type === "string" || arg.type === "password") {
      const isMissing = arg.required && (!value || value.trim() === "");
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium mb-1">
            {arg.label || arg.name}{" "}
            {arg.required && <span className="text-red-500">*</span>}
          </label>
          <input
            type={arg.type === "password" ? "password" : "text"}
            placeholder={arg.placeholder || ""}
            className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
              isMissing ? "border-destructive" : "border-border"
            }`}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            required={arg.required}
          />
          {isMissing && (
            <p className="text-destructive text-xs mt-1">
              This field is required
            </p>
          )}
        </div>
      );
    }

    if (arg.type === "array") {
      const arrVal: string[] = Array.isArray(value) ? value : [];
      const handleItemChange = (idx: number, val: string) => {
        const newArr = [...arrVal];
        newArr[idx] = val;
        onChange(newArr);
      };
      const isMissing = arg.required && arrVal.length === 0;
      return (
        <div key={key} className="mb-3">
          <label className="block text-sm font-medium mb-1">
            {arg.label || arg.name}{" "}
            {arg.required && <span className="text-red-500">*</span>}
          </label>
          {arrVal.map((item, idx) => (
            <div key={`${key}-${idx}`} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={arg.items?.placeholder || ""}
                className="flex-grow rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={item}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                required={arg.required}
              />
              <button
                type="button"
                className="text-destructive hover:text-destructive-foreground"
                onClick={() => onChange(arrVal.filter((_, i) => i !== idx))}
              >
                &times;
              </button>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => onChange([...arrVal, ""])}
            disabled={arrVal.length >= 10}
          >
            Add Item
          </Button>
          {isMissing && (
            <p className="text-destructive text-xs mt-1">
              At least one item is required
            </p>
          )}
        </div>
      );
    }

    if (arg.type === "object" && arg.properties) {
      const propsArr = Object.entries(arg.properties).map(
        ([key, val]: any) => ({ ...val, name: key }),
      );
      return (
        <fieldset
          key={key}
          className="mb-4 border border-dashed border-border p-3 rounded"
        >
          <legend className="font-semibold text-sm mb-3">
            {arg.label || arg.name}{" "}
            {arg.required && <span className="text-red-500">*</span>}
          </legend>
          {propsArr.map((subArg) =>
            renderArgInput(
              testId,
              subArg,
              value?.[subArg.name],
              (val) => {
                onChange({ ...(value || {}), [subArg.name]: val });
              },
              fullPath,
            ),
          )}
        </fieldset>
      );
    }

    return null;
  };

  // ---------------------- Validation ----------------------
  function areArgsValid(): boolean {
    for (const testId of selectedTests) {
      const testDef = scanTests.find((t) => t.id === testId);
      if (testDef?.args) {
        for (const arg of testDef.args) {
          const val = testsArgsValues[testId]?.[arg.name];
          if (arg.required) {
            if (arg.type === "string" || arg.type === "password") {
              if (!val || val.trim() === "") return false;
            }
            if (
              arg.type === "array" &&
              (!Array.isArray(val) || val.length === 0)
            )
              return false;
            if (arg.type === "object" && arg.properties) {
              const propsArr = Object.entries(arg.properties).map(
                ([key, v]: any) => ({ ...v, name: key }),
              );
              for (const subArg of propsArr) {
                const subVal = val?.[subArg.name];
                if (
                  subArg.required &&
                  (!subVal ||
                    (typeof subVal === "string" && subVal.trim() === ""))
                )
                  return false;
              }
            }
          }
        }
      }
    }
    return true;
  }

  // ---------------------- Run Scan ----------------------
  const handleRunScanClick = () => {
    const argsPayload: Record<string, any> = {};
    selectedTests.forEach((testId) => {
      argsPayload[testId] = { ...(testsArgsValues[testId] || {}) };
    });
    onRunScan(argsPayload);
  };

  // ---------------------- Render ----------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {connectionStatus === "connected" && (
        <Alert className="flex items-center gap-2" variant="default">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            Connected to: <strong>{connectedDb}</strong>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg font-semibold">
              Security Scan Configuration
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-5 w-5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Select security tests to run on your database.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Choose which security tests to run. Use search and category filters
            below.
          </CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-grow max-w-full sm:max-w-xs w-full">
              <input
                type="text"
                placeholder="Search tests..."
                className="w-full rounded border border-border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <select
              className="rounded border border-border p-2 text-sm cursor-pointer max-w-full sm:max-w-xs"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          {pagedTests.length === 0 && (
            <p className="text-center text-muted-foreground">No tests found.</p>
          )}
          {pagedTests.map((test) => {
            const isSelected = selectedTests.includes(test.id);
            const Icon = iconMap[test.icon as keyof typeof iconMap] || Shield;
            return (
              <div
                key={test.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary-muted"
                    : "border-border hover:border-accent focus-within:border-accent"
                }`}
                tabIndex={0}
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => handleTestToggle(test.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTestToggle(test.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleTestToggle(test.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <h3 className="font-medium text-card-foreground whitespace-nowrap">
                        {test.name}
                      </h3>
                      <Badge
                        className={severityColors[test.severity]}
                        variant="secondary"
                      >
                        {test.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {test.details}
                    </p>
                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {test.category_tags.map((tag) => (
                        <Badge key={`${test.id}-${tag}`} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {isSelected && test.args && test.args?.length > 0 && (
                  <div
                    className="mt-4 border-t border-border pt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {test.args.map((arg) =>
                      renderArgInput(
                        test.id,
                        arg,
                        testsArgsValues[test.id]?.[arg.name],
                        (val) =>
                          setTestsArgsValues((prev) => ({
                            ...prev,
                            [test.id]: {
                              ...(prev[test.id] || {}),
                              [arg.name]: val,
                            },
                          })),
                      ),
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground select-none">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-border flex-wrap gap-4">
            <div className="flex gap-3 items-center flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onSelectedTestsChange([]);
                  setTestsArgsValues({});
                }}
                disabled={selectedTests.length === 0}
              >
                Clear Selection
              </Button>
              <span className="text-sm text-muted-foreground select-none">
                {selectedTests.length} test
                {selectedTests.length !== 1 ? "s" : ""} selected
              </span>
            </div>

            <Button
              size="sm"
              onClick={handleRunScanClick}
              disabled={
                selectedTests.length === 0 ||
                connectionStatus !== "connected" ||
                !areArgsValid()
              }
              aria-disabled={
                selectedTests.length === 0 ||
                connectionStatus !== "connected" ||
                !areArgsValid()
              }
            >
              Run Scan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
