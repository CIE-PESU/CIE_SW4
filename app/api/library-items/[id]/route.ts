import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/library-items/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const itemId = params.id;
  try {
    // Deleting LibraryItem will cascade to LibraryRequest via onDelete: Cascade
    await prisma.libraryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ message: "Library item deleted" });
  } catch (error: any) {
    console.error("Delete library item error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to delete item" }, { status: 500 });
  }
}

// PATCH /api/library-items/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const itemId = params.id;
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    
    // Safely handle purchase_date and purchase_value
    let purchaseDate = undefined;
    if (body.purchase_date) {
      const date = new Date(body.purchase_date);
      purchaseDate = isNaN(date.getTime()) ? undefined : date;
    }
    
    let purchaseValue = undefined;
    if (body.purchase_value !== undefined && body.purchase_value !== null && body.purchase_value !== "") {
      const num = Number(body.purchase_value);
      purchaseValue = isNaN(num) ? undefined : num;
    }

    const updatedItem = await prisma.libraryItem.update({
      where: { id: itemId },
      data: {
        item_name: body.item_name,
        author: body.author,
        item_description: body.item_description,
        item_category: body.item_category,
        item_quantity: body.item_quantity !== undefined ? Number(body.item_quantity) : undefined,
        item_location: body.item_location,
        item_specification: body.item_specification,
        available_quantity: body.available_quantity !== undefined ? Number(body.available_quantity) : undefined,
        front_image_id: body.front_image_id,
        back_image_id: body.back_image_id,
        invoice_number: body.invoice_number,
        purchased_from: body.purchased_from,
        purchase_date: purchaseDate,
        purchase_value: purchaseValue !== undefined ? purchaseValue : undefined,
        purchase_currency: body.purchase_currency,
        modified_by: body.modified_by,
      },
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error: any) {
    console.error("Update library item error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update item" }, { status: 500 });
  }
}
