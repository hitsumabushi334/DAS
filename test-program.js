function greet(name) {
    return `こんにちは、${name}さん！`;
}

function calculate(a, b) {
    return {
        sum: a + b,
        difference: a - b,
        product: a * b,
        quotient: b !== 0 ? a / b : 'ゼロ除算エラー'
    };
}

function main() {
    console.log(greet('テストユーザー'));
    
    const result = calculate(10, 3);
    console.log('計算結果:', result);
    
    const numbers = [1, 2, 3, 4, 5];
    const doubled = numbers.map(n => n * 2);
    console.log('倍にした数値:', doubled);
}

if (require.main === module) {
    main();
}

module.exports = { greet, calculate };