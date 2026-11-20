/** Рассчитывает выручку по позиции чека с учётом скидки. */
function calculateSimpleRevenue(purchase, _product) {
    const discountMultiplier = 1 - purchase.discount / 100;
    return purchase.sale_price * purchase.quantity * discountMultiplier;
}

/** Рассчитывает бонус продавца по его позиции в рейтинге. */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;
    }
    if (index === 1 || index === 2) {
        return seller.profit * 0.10;
    }
    if (index === total - 1) {
        return 0;
    }
    return seller.profit * 0.05;
}

/** Формирует отчёт о продажах и бонусах по каждому продавцу. */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    const { calculateRevenue, calculateBonus } = options ?? {};
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Не заданы функции расчёта выручки и бонусов');
    }

    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: seller.first_name + ' ' + seller.last_name,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: Object.create(null),
    }));
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]));
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    for (const record of data.purchase_records) {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        for (const item of record.items) {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            seller.profit += revenue - cost;
            seller.products_sold[item.sku] = (seller.products_sold[item.sku] ?? 0) + item.quantity;
        }
    }

    sellerStats.sort((firstSeller, secondSeller) => secondSeller.profit - firstSeller.profit);

    return sellerStats.map((seller, index) => {
        const bonus = calculateBonus(index, sellerStats.length, seller);
        const topProducts = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((firstProduct, secondProduct) => secondProduct.quantity - firstProduct.quantity)
            .slice(0, 10);

        return {
            seller_id: seller.id,
            name: seller.name,
            revenue: +seller.revenue.toFixed(2),
            profit: +seller.profit.toFixed(2),
            sales_count: seller.sales_count,
            top_products: topProducts,
            bonus: +bonus.toFixed(2),
        };
    });
}
