interface BaseBlock {
  id?: number;
  name?: string;
  layout?: Layout;
}

interface FullHeightBlock extends BaseBlock {
  height: "full";
  width: number;
}

interface FullWidthBlock extends BaseBlock {
  width: "full";
  height: number;
}

interface SizedBlock extends BaseBlock {
  width: number;
  height: number;
}

interface FullSizedBlock extends BaseBlock {
  height: "full";
  width: "full";
}

type VerticalLayout = {
  type: "vertical";
  position: "top" | "bottom" | "center";
  blocks: Block[];
}

type HorizontalLayout = {
  type: "horizontal";
  position: "left" | "right" | "center";
  blocks: Block[];
}

export type Layout = HorizontalLayout | VerticalLayout;

export type Block =
  FullSizedBlock |
  FullHeightBlock |
  FullWidthBlock |
  SizedBlock;
