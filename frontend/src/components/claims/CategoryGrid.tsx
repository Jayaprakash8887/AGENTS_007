import {
  GraduationCap,
  Plane,
  Utensils,
  Car,
  Hotel,
  Laptop,
  Phone,
  HeartPulse,
  Briefcase,
} from "lucide-react";
import { CategoryCard } from "./CategoryCard";

export interface Category {
  id: string;
  icon: typeof GraduationCap;
  title: string;
  requiredDocs: string[];
}

const categories: Category[] = [
  {
    id: "certification",
    icon: GraduationCap,
    title: "Certification",
    requiredDocs: ["Certificate", "Invoice", "Approval Email"],
  },
  {
    id: "travel",
    icon: Plane,
    title: "Travel",
    requiredDocs: ["Tickets", "Boarding Pass", "Itinerary"],
  },
  {
    id: "team-lunch",
    icon: Utensils,
    title: "Team Lunch",
    requiredDocs: ["Receipt", "Attendee List"],
  },
  {
    id: "conveyance",
    icon: Car,
    title: "Conveyance",
    requiredDocs: ["Receipts", "Route Details"],
  },
  {
    id: "accommodation",
    icon: Hotel,
    title: "Accommodation",
    requiredDocs: ["Hotel Invoice", "Booking Confirmation"],
  },
  {
    id: "equipment",
    icon: Laptop,
    title: "Equipment",
    requiredDocs: ["Invoice", "Warranty Card", "Manager Approval"],
  },
  {
    id: "phone-internet",
    icon: Phone,
    title: "Phone & Internet",
    requiredDocs: ["Bill Copy", "Usage Report"],
  },
  {
    id: "medical",
    icon: HeartPulse,
    title: "Medical",
    requiredDocs: ["Medical Bill", "Prescription", "Insurance Claim"],
  },
  {
    id: "client-meeting",
    icon: Briefcase,
    title: "Client Meeting",
    requiredDocs: ["Receipt", "Meeting Notes", "Client Name"],
  },
];

interface CategoryGridProps {
  selectedCategory: string | null;
  onSelectCategory: (category: Category) => void;
}

export function CategoryGrid({ selectedCategory, onSelectCategory }: CategoryGridProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Select Expense Category</h2>
        <p className="mt-2 text-muted-foreground">
          Choose the category that best matches your expense
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            icon={category.icon}
            title={category.title}
            requiredDocs={category.requiredDocs}
            isSelected={selectedCategory === category.id}
            onClick={() => onSelectCategory(category)}
          />
        ))}
      </div>
    </div>
  );
}

export { categories };
