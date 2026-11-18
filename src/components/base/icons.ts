// Icon registry: Tabler Icons (MIT, @tabler/icons), outline, inlined at build time as SVG components.
import IArrowRight from '@tabler/icons/outline/arrow-right.svg';
import IArrowUpRight from '@tabler/icons/outline/arrow-up-right.svg';
import IArrowDown from '@tabler/icons/outline/arrow-down.svg';
import IPhone from '@tabler/icons/outline/phone.svg';
import IMail from '@tabler/icons/outline/mail.svg';
import IMapPin from '@tabler/icons/outline/map-pin.svg';
import IMenu2 from '@tabler/icons/outline/menu-2.svg';
import IX from '@tabler/icons/outline/x.svg';
import ICheck from '@tabler/icons/outline/check.svg';
import IAlertCircle from '@tabler/icons/outline/alert-circle.svg';
import IUpload from '@tabler/icons/outline/upload.svg';
import IPlug from '@tabler/icons/outline/plug.svg';
import IBolt from '@tabler/icons/outline/bolt.svg';
import IHome from '@tabler/icons/outline/home.svg';
import IBuilding from '@tabler/icons/outline/building.svg';
import IRulerMeasure from '@tabler/icons/outline/ruler-measure.svg';
import IClock from '@tabler/icons/outline/clock.svg';
import IChevronDown from '@tabler/icons/outline/chevron-down.svg';
import IInfoCircle from '@tabler/icons/outline/info-circle.svg';
import IFileText from '@tabler/icons/outline/file-text.svg';
import ICube3dSphere from '@tabler/icons/outline/cube-3d-sphere.svg';
import IChargingPile from '@tabler/icons/outline/charging-pile.svg';
import ICalendarEvent from '@tabler/icons/outline/calendar-event.svg';
import IPaint from '@tabler/icons/outline/paint.svg';
import IWall from '@tabler/icons/outline/wall.svg';

export const ICONS = {
  'arrow-right': IArrowRight,
  'arrow-up-right': IArrowUpRight,
  'arrow-down': IArrowDown,
  'phone': IPhone,
  'mail': IMail,
  'map-pin': IMapPin,
  'menu-2': IMenu2,
  'x': IX,
  'check': ICheck,
  'alert-circle': IAlertCircle,
  'upload': IUpload,
  'plug': IPlug,
  'bolt': IBolt,
  'home': IHome,
  'building': IBuilding,
  'ruler-measure': IRulerMeasure,
  'clock': IClock,
  'chevron-down': IChevronDown,
  'info-circle': IInfoCircle,
  'file-text': IFileText,
  'cube-3d-sphere': ICube3dSphere,
  'charging-pile': IChargingPile,
  'calendar-event': ICalendarEvent,
  'paint': IPaint,
  'wall': IWall,
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];
