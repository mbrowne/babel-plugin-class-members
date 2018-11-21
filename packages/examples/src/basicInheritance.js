class Base {
    let x = 1;
}

class Sub extends Base {
    let x;  // unrelated to Base's `x`; this is private to Sub
    let y = 0;

    constructor() {
        super();
        this::y = this.getInitialValueForY();
        console.log(this::x, this::y);
    }

    getInitialValueForY() {
        return 2;
    }
  }
  
  new Sub()
  