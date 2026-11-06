import {
  Baby,
  BookOpen,
  Dumbbell,
  Footprints,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  Watch,
} from 'lucide-react';

export const CATEGORY_ICONS = {
  mujer: Sparkles,
  hombre: Shirt,
  ninos: Baby,
  calzados: Footprints,
  accesorios: Watch,
  electronica: Smartphone,
  hogar: Sofa,
  deportes: Dumbbell,
  libros: BookOpen,
  otros: Package,
};

export const categoryIcon = (id) => CATEGORY_ICONS[id] ?? Package;
