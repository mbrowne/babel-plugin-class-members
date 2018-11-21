class Demo {
  let x, y;
  const z = 0;
  // aPublicProp;

  foo() {
    this::x = 1;
    console.log(this::x, this::y);
    console.log(this::z);
    // TypeError
    this::z = 1;
  }
}

new Demo().foo();

export default Demo
