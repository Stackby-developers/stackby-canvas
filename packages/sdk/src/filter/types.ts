/** Relative date shorthand values */
export type RelativeDate =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'thisQuarter'
  | 'thisYear';

/** Rolling N-day window */
export interface LastNDays {
  lastNDays: number;
}

/** All valid right-hand-side values in a filter condition */
export type FilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | RelativeDate
  | LastNDays;

/** All comparison operators */
export type FilterOp =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'doesNotContain'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'before'
  | 'after'
  | 'onOrBefore'
  | 'onOrAfter'
  | 'within'
  | 'linkedTo'
  | 'anyOf'
  | 'allOf';

/** A leaf condition */
export interface LeafCondition {
  column: string;
  op: FilterOp;
  value?: FilterValue;
}

/** Compound AND condition */
export interface AndCondition {
  and: FilterCondition[];
}

/** Compound OR condition */
export interface OrCondition {
  or: FilterCondition[];
}

/** A filter is a tree of conditions */
export type FilterCondition = LeafCondition | AndCondition | OrCondition;
