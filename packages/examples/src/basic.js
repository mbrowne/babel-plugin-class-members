class Demo {
  let x, y;
  const z = 1;

  foo() {
    console.log('hi');
    this::x;
  }
}

// class Demo {
//   foo() {
//     console.log('hi');
//   }
// }