import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "zh";

const KEY = "tiding_lang";

const dict = {
  // 通用
  appName: { en: "Order Management", zh: "提单管理系统" },
  switchRole: { en: "Switch role", zh: "切换角色" },
  gallery: { en: "Product Gallery", zh: "商品图库" },
  submitOrder: { en: "Submit Order", zh: "提交提单" },
  processOrders: { en: "Process Orders", zh: "提单处理" },
  selectRole: { en: "Select your role to enter", zh: "请选择你的角色进入系统" },
  bigShop: { en: "Big Shop", zh: "大店" },
  smallShop: { en: "Small Shop", zh: "小店" },
  warehouse: { en: "Warehouse", zh: "仓库" },
  bigShopDesc: { en: "Big Shop · Submit product orders", zh: "大店 · 提交商品提单" },
  smallShopDesc: { en: "Small Shop · Submit product orders", zh: "小店 · 提交商品提单" },
  warehouseDesc: { en: "Warehouse · Process & verify orders", zh: "仓库 · 处理与核对提单" },
  delete: { en: "Delete", zh: "删除" },
  // 商品图库
  productName: { en: "Product Name", zh: "商品名称" },
  productNamePh: { en: "e.g. Wireless Mouse", zh: "例如：无线鼠标" },
  productImage: { en: "Product Image", zh: "商品图片" },
  addProduct: { en: "Add Product", zh: "添加商品" },
  productAdded: { en: "Product added", zh: "商品已入库" },
  addFailed: { en: "Failed to add: ", zh: "添加失败：" },
  deleted: { en: "Deleted", zh: "已删除" },
  enterName: { en: "Please enter a product name", zh: "请输入商品名称" },
  chooseImage: { en: "Please choose an image", zh: "请选择商品图片" },
  imageRead: { en: "Image loaded — tap \"Add Product\" to save", zh: "图片已读取，点击「添加商品」入库" },
  imageReadFail: { en: "Failed to read image, try another one", zh: "图片读取失败，请换一张试试" },
  emptyGallery: { en: "Gallery is empty — upload some product images", zh: "图库为空，先上传一批商品图片吧" },
  idNo: { en: "No. #", zh: "编号 #" },
  // 提交提单
  step1: { en: "① Tap product images to add order items", zh: "① 从图库点击商品图片，加入提单明细" },
  step2: { en: "② Fill in item details", zh: "② 填写明细信息" },
  galleryEmptyHint: { en: "Gallery is empty — upload products in \"Product Gallery\" first", zh: "商品库为空，请先到「商品图库」上传商品" },
  alreadyAdded: { en: "Already in the list", zh: "该商品已在明细中" },
  added: { en: "Added", zh: "已加入" },
  addRow: { en: "Add a row", zh: "手动添加一行" },
  noItems: { en: "No items — tap products above", zh: "暂无明细，从上方图库点选商品" },
  tapImagesFirst: { en: "Tap images to add items first", zh: "请先点击图片添加明细" },
  nameRequired: { en: "Product name is required", zh: "品名不能为空" },
  orderSubmitted: { en: "Order submitted: ", zh: "提单提交成功：" },
  submitFailed: { en: "Submit failed: ", zh: "提交失败：" },
  name: { en: "Name *", zh: "品名 *" },
  qty: { en: "Qty", zh: "数量" },
  size: { en: "Size", zh: "尺寸" },
  shop: { en: "Shop", zh: "店铺" },
  date: { en: "Date", zh: "日期" },
  remark: { en: "Remark", zh: "备注" },
  orderRemarkPh: { en: "Order remark (optional)", zh: "提单备注（可选）" },
  submitBtn: { en: "Submit Order", zh: "提交提单" },
  itemsTotal: { en: "items", zh: "条明细" },
  noImage: { en: "No image", zh: "无图片" },
  // 提单处理
  waitingOrders: { en: "Waiting for shops to submit orders", zh: "暂无提单，等待店铺提交" },
  noPending: { en: "No pending orders", zh: "没有待处理的提单" },
  orderNo: { en: "Order ", zh: "提单 " },
  completed: { en: "✓ Completed", zh: "✓ 已完成" },
  processing: { en: "Processing", zh: "处理中" },
  archived: { en: "Archived (all completed)", zh: "已归档（全部处理完成）" },
  archivedCount: { en: "orders", zh: "张" },
  confirm: { en: "Confirm", zh: "确认" },
  undo: { en: "Undo", zh: "撤销" },
  confirmed: { en: "Confirmed", zh: "已确认" },
  undoFailed: { en: "Undo failed: ", zh: "撤销失败：" },
  confirmFailed: { en: "Confirm failed: ", zh: "确认失败：" },
  notAllDone: { en: "All items must be processed first", zh: "请先处理完所有明细" },
  declared: { en: "Declared", zh: "申报" },
  actualQty: { en: "Actual Qty", zh: "实际数量" },
  diff: { en: "Diff", zh: "差异" },
  processed: { en: "Processed", zh: "已处理" },
  saveFailed: { en: "Save failed: ", zh: "保存失败：" },
  actualSaveFailed: { en: "Failed to save actual qty: ", zh: "实际数量保存失败：" },
  orderDeleted: { en: "Order deleted", zh: "提单已删除" },
  deleteOrder: { en: "Delete order", zh: "删除提单" },
  zoomIn: { en: "Tap to zoom", zh: "点击放大" },
  remarkPrefix: { en: "Remark: ", zh: "备注：" },
  // 尺寸设置（仓库管理员）
  sizeSettings: { en: "Size Options (Admin)", zh: "尺寸选项设置（管理员）" },
  sizeSettingsDesc: { en: "Options available in the size dropdown when shops submit orders", zh: "店铺提交提单时，尺寸下拉框中的可选项" },
  addSizePh: { en: "Add a size, e.g. 3XL", zh: "添加尺寸，如 3XL" },
  add: { en: "Add", zh: "添加" },
  sizeSaved: { en: "Size options saved", zh: "尺寸选项已保存" },
  sizeSaveFailed: { en: "Failed to save: ", zh: "保存失败：" },
  sizeExists: { en: "This size already exists", zh: "该尺寸已存在" },
  // 品名映射配置（管理员）
  itemNameMapping: { en: "Item Name ↔ Image Mapping (Admin)", zh: "品名 ↔ 图片映射（管理员）" },
  mappingDesc: {
    en: "Each item name maps to multiple images; each image can belong to multiple item names. Used for the item-name dropdown and image gallery when shops submit orders.",
    zh: "一个品名对应多张图片，一张图片也可属于多个品名。店铺提交提单时的品名下拉框与选品图库由此决定。",
  },
  newItemNamePh: { en: "New item name, e.g. Wireless Mouse", zh: "新品名，如 无线鼠标" },
  itemNameAdded: { en: "Item name added", zh: "品名已添加" },
  itemNameDeleted: { en: "Item name deleted", zh: "品名已删除" },
  nameExists: { en: "This item name already exists", zh: "该品名已存在" },
  linkedImages: { en: "linked images", zh: "张关联图片" },
  pickImages: { en: "Select images", zh: "选择图片" },
  mappingSaved: { en: "Mapping saved", zh: "映射已保存" },
  noItemNames: { en: "No item names yet — add one above", zh: "还没有品名，先在上方添加" },
  selectName: { en: "Select name *", zh: "选择品名 *" },
  unmapped: { en: "Unmapped", zh: "未分组" },
  // 数据统计
  stats: { en: "Statistics", zh: "数据统计" },
  shopCol: { en: "Shop", zh: "店铺" },
  itemNameCol: { en: "Item Name", zh: "品名" },
  qtyCol: { en: "Actual Qty", zh: "实际数量" },
  shopSubtotal: { en: "Subtotal", zh: "小计" },
  dailyTotal: { en: "Daily Total", zh: "当日合计" },
  noStatsData: { en: "No confirmed orders yet", zh: "暂无已确认的订单数据" },
  // 大图选品
  largeImagePick: { en: "Large view", zh: "大图选品" },
  selectMode: { en: "Select", zh: "选择" },
  cancelSelect: { en: "Cancel", zh: "取消" },
  addSelected: { en: "Add", zh: "添加" },
  selectedCount: { en: "selected", zh: "已选" },
  addImg: { en: "Add", zh: "添加" },
  imgAdded: { en: "Added", zh: "已添加" },
  expandMore: { en: "Show more", zh: "展开更多" },
  collapse: { en: "Collapse", zh: "收起" },
} as const;

export type DictKey = keyof typeof dict;

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
}

const Ctx = createContext<I18nCtx>(null as unknown as I18nCtx);

function getInitialLang(): Lang {
  const saved = localStorage.getItem(KEY);
  return saved === "zh" || saved === "en" ? saved : "en"; // 默认英语
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);
  const setLang = (l: Lang) => {
    localStorage.setItem(KEY, l);
    setLangState(l);
  };
  const t = (k: DictKey) => dict[k][lang];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
